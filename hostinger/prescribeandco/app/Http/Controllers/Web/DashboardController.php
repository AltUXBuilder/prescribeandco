<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Enums\AuditAction;
use App\Models\PrescriptionRequest;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class DashboardController extends Controller
{
    public function __construct(private readonly AuditService $audit) {}

    public function index(Request $request): View
    {
        $customerId = $request->session()->get('user_id');

        $prescriptions = PrescriptionRequest::where('customer_id', $customerId)
            ->with('product')
            ->orderByDesc('submitted_at')
            ->orderByDesc('created_at')
            ->paginate(10);

        return view('dashboard.index', compact('prescriptions'));
    }

    public function prescription(Request $request, string $id): View
    {
        $customerId = $request->session()->get('user_id');

        // 404 for non-owned resources — never leak existence via 403
        $prescription = PrescriptionRequest::where('id', $id)
            ->where('customer_id', $customerId)
            ->with('product')
            ->firstOrFail();

        return view('dashboard.prescription', compact('prescription'));
    }

    public function cancel(Request $request, string $id): RedirectResponse
    {
        $customerId = $request->session()->get('user_id');

        $prescription = PrescriptionRequest::where('id', $id)
            ->where('customer_id', $customerId)
            ->firstOrFail();

        if (!$prescription->is_cancellable) {
            return back()->withErrors(['status' => 'This prescription cannot be cancelled.']);
        }

        $old = $prescription->status->value;
        $prescription->update([
            'status'       => 'CANCELLED',
            'cancelled_at' => now(),
        ]);

        $this->audit->log(
            $customerId,
            AuditAction::PRESCRIPTION_CANCELLED,
            'prescription_requests',
            $prescription->id,
            ['status' => $old],
            ['status' => 'CANCELLED', 'reason' => 'Cancelled by customer'],
        );

        return redirect()->route('dashboard')
            ->with('success', 'Prescription request cancelled.');
    }
}
