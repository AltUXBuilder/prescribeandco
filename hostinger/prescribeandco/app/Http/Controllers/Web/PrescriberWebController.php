<?php

namespace App\Http\Controllers\Web;

use App\Enums\AuditAction;
use App\Enums\PrescriptionStatus;
use App\Http\Controllers\Controller;
use App\Models\PrescriberProfile;
use App\Models\PrescriptionRequest;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class PrescriberWebController extends Controller
{
    public function __construct(private readonly AuditService $audit) {}

    // ── Queue ────────────────────────────────────────────────────────────────

    public function queue(): View
    {
        $pending = PrescriptionRequest::with(['customer', 'product'])
            ->where('status', PrescriptionStatus::SUBMITTED)
            ->orderBy('submitted_at')
            ->paginate(20, ['*'], 'pending');

        $mine = PrescriptionRequest::with(['customer', 'product'])
            ->where('status', PrescriptionStatus::UNDER_REVIEW)
            ->where('prescriber_id', session('user_id'))
            ->orderBy('reviewed_at')
            ->paginate(20, ['*'], 'mine');

        return view('prescriber.queue', compact('pending', 'mine'));
    }

    // ── Prescription detail ──────────────────────────────────────────────────

    public function show(string $id): View
    {
        $rx = PrescriptionRequest::with(['customer', 'product', 'questionnaireResponse.questionnaire'])
            ->whereIn('status', [
                PrescriptionStatus::SUBMITTED,
                PrescriptionStatus::UNDER_REVIEW,
                PrescriptionStatus::APPROVED,
                PrescriptionStatus::REJECTED,
            ])
            ->findOrFail($id);

        $orderHistory = PrescriptionRequest::where('customer_id', $rx->customer_id)
            ->where('id', '!=', $rx->id)
            ->with('product')
            ->orderByDesc('submitted_at')
            ->limit(10)
            ->get();

        $this->audit->log(
            session('user_id'), AuditAction::PRESCRIPTION_VIEWED,
            'prescription_requests', $id,
            null, null, null, 'PRESCRIBER', $this->gphc()
        );

        return view('prescriber.show', compact('rx', 'orderHistory'));
    }

    // ── Actions ──────────────────────────────────────────────────────────────

    public function claim(Request $request, string $id): RedirectResponse
    {
        $rx = PrescriptionRequest::where('status', PrescriptionStatus::SUBMITTED)->findOrFail($id);

        $rx->update([
            'status'        => PrescriptionStatus::UNDER_REVIEW,
            'prescriber_id' => session('user_id'),
            'reviewed_at'   => now(),
        ]);

        $this->audit->log(
            session('user_id'), AuditAction::PRESCRIPTION_TAKEN_UNDER_REVIEW,
            'prescription_requests', $id,
            ['status' => 'SUBMITTED'], ['status' => 'UNDER_REVIEW'], null, 'PRESCRIBER', $this->gphc()
        );

        return redirect()->route('prescriber.show', $id)->with('success', 'Prescription claimed for review.');
    }

    public function approve(Request $request, string $id): RedirectResponse
    {
        $data = $request->validate([
            'dosage_instructions' => 'required|string|max:1000',
            'quantity_dispensed'  => 'required|integer|min:1|max:9999',
            'expiry_date'         => 'required|date|after:today',
            'prescriber_note'     => 'nullable|string|max:2000',
        ]);

        $rx = PrescriptionRequest::where('status', PrescriptionStatus::UNDER_REVIEW)
            ->where('prescriber_id', session('user_id'))
            ->findOrFail($id);

        $rx->update(array_merge($data, [
            'status'          => PrescriptionStatus::APPROVED,
            'approved_at'     => now(),
            'prescribed_date' => now()->toDateString(),
        ]));

        $this->audit->log(
            session('user_id'), AuditAction::PRESCRIPTION_APPROVED,
            'prescription_requests', $id,
            ['status' => 'UNDER_REVIEW'],
            ['status' => 'APPROVED', 'dosage' => $data['dosage_instructions'], 'expiry' => $data['expiry_date']],
            null, 'PRESCRIBER', $this->gphc()
        );

        return redirect()->route('prescriber.queue')->with('success', 'Prescription approved and sent for dispensing.');
    }

    public function reject(Request $request, string $id): RedirectResponse
    {
        $data = $request->validate([
            'rejection_reason' => 'required|string|min:10|max:2000',
            'prescriber_note'  => 'nullable|string|max:2000',
        ]);

        $rx = PrescriptionRequest::where('status', PrescriptionStatus::UNDER_REVIEW)
            ->where('prescriber_id', session('user_id'))
            ->findOrFail($id);

        $rx->update(array_merge($data, ['status' => PrescriptionStatus::REJECTED]));

        $this->audit->log(
            session('user_id'), AuditAction::PRESCRIPTION_REJECTED,
            'prescription_requests', $id,
            ['status' => 'UNDER_REVIEW'],
            ['status' => 'REJECTED', 'reason' => $data['rejection_reason']],
            null, 'PRESCRIBER', $this->gphc()
        );

        return redirect()->route('prescriber.queue')->with('success', 'Prescription rejected.');
    }

    public function requestInfo(Request $request, string $id): RedirectResponse
    {
        $data = $request->validate(['prescriber_note' => 'required|string|min:10|max:2000']);

        $rx = PrescriptionRequest::where('status', PrescriptionStatus::UNDER_REVIEW)
            ->where('prescriber_id', session('user_id'))
            ->findOrFail($id);

        $rx->update($data);

        $this->audit->log(
            session('user_id'), AuditAction::PRESCRIPTION_MORE_INFO,
            'prescription_requests', $id,
            null, null, null, 'PRESCRIBER', $this->gphc()
        );

        return redirect()->route('prescriber.show', $id)->with('success', 'Information request saved.');
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function gphc(): ?string
    {
        return PrescriberProfile::where('user_id', session('user_id'))->value('gphc_number');
    }
}
