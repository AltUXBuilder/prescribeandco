<?php

namespace App\Http\Controllers\Web;

use App\Enums\AuditAction;
use App\Enums\PrescriptionStatus;
use App\Http\Controllers\Controller;
use App\Models\PrescriptionRequest;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class DispenserWebController extends Controller
{
    public function __construct(private readonly AuditService $audit) {}

    public function queue(): View
    {
        $approved = PrescriptionRequest::with(['customer', 'product'])
            ->where('status', PrescriptionStatus::APPROVED)
            ->orderBy('approved_at')
            ->paginate(20, ['*'], 'approved');

        $mine = PrescriptionRequest::with(['customer', 'product'])
            ->where('status', PrescriptionStatus::DISPENSING)
            ->where('dispenser_id', session('user_id'))
            ->orderBy('dispensing_started_at')
            ->paginate(20, ['*'], 'mine');

        return view('dispenser.queue', compact('approved', 'mine'));
    }

    public function show(string $id): View
    {
        $rx = PrescriptionRequest::with(['customer', 'product'])
            ->whereIn('status', [
                PrescriptionStatus::APPROVED,
                PrescriptionStatus::DISPENSING,
                PrescriptionStatus::FULFILLED,
            ])
            ->findOrFail($id);

        return view('dispenser.show', compact('rx'));
    }

    public function claim(Request $request, string $id): RedirectResponse
    {
        $rx = PrescriptionRequest::where('status', PrescriptionStatus::APPROVED)->findOrFail($id);

        $rx->update([
            'status'               => PrescriptionStatus::DISPENSING,
            'dispenser_id'         => session('user_id'),
            'dispensing_started_at'=> now(),
        ]);

        $this->audit->log(session('user_id'), AuditAction::DISPENSING_STARTED, 'prescription_requests', $id,
            ['status' => 'APPROVED'], ['status' => 'DISPENSING']);

        return redirect()->route('dispenser.show', $id)->with('success', 'Prescription claimed for dispensing.');
    }

    public function fulfil(Request $request, string $id): RedirectResponse
    {
        $data = $request->validate([
            'tracking_number' => 'required|string|max:100',
            'courier_name'    => 'required|string|max:100',
            'dispensing_note' => 'nullable|string|max:1000',
        ]);

        $rx = PrescriptionRequest::where('status', PrescriptionStatus::DISPENSING)
            ->where('dispenser_id', session('user_id'))
            ->findOrFail($id);

        $rx->update(array_merge($data, [
            'status'      => PrescriptionStatus::FULFILLED,
            'fulfilled_at'=> now(),
        ]));

        $this->audit->log(session('user_id'), AuditAction::DISPENSING_FULFILLED, 'prescription_requests', $id,
            ['status' => 'DISPENSING'], ['status' => 'FULFILLED']);

        return redirect()->route('dispenser.queue')->with('success', 'Prescription marked as fulfilled.');
    }
}
