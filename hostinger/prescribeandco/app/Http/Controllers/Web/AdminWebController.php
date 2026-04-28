<?php

namespace App\Http\Controllers\Web;

use App\Enums\AuditAction;
use App\Enums\PrescriptionStatus;
use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\PrescriptionRequest;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class AdminWebController extends Controller
{
    public function __construct(private readonly AuditService $audit) {}

    public function index(): View
    {
        $stats = [
            'total_users'        => User::count(),
            'customers'          => User::where('role', Role::CUSTOMER)->count(),
            'prescribers'        => User::where('role', Role::PRESCRIBER)->count(),
            'dispensers'         => User::where('role', Role::DISPENSER)->count(),
            'pending_review'     => PrescriptionRequest::whereIn('status', [
                PrescriptionStatus::SUBMITTED, PrescriptionStatus::UNDER_REVIEW,
            ])->count(),
            'approved_today'     => PrescriptionRequest::where('status', PrescriptionStatus::APPROVED)
                ->whereDate('approved_at', today())->count(),
            'fulfilled_total'    => PrescriptionRequest::where('status', PrescriptionStatus::FULFILLED)->count(),
            'revenue_pence'      => Payment::where('status', 'CAPTURED')->sum('amount_pence'),
        ];

        $recentPrescriptions = PrescriptionRequest::with(['customer', 'product'])
            ->orderByDesc('created_at')
            ->limit(8)
            ->get();

        $recentUsers = User::orderByDesc('created_at')->limit(6)->get();

        return view('admin.index', compact('stats', 'recentPrescriptions', 'recentUsers'));
    }

    public function users(Request $request): View
    {
        $query = User::orderByDesc('created_at');

        if ($request->filled('role')) {
            $query->where('role', $request->input('role'));
        }
        if ($request->filled('search')) {
            $q = $request->input('search');
            $query->where(function ($qb) use ($q) {
                $qb->where('email', 'like', "%{$q}%")
                   ->orWhere('first_name', 'like', "%{$q}%")
                   ->orWhere('last_name', 'like', "%{$q}%");
            });
        }

        $users = $query->paginate(25)->withQueryString();

        return view('admin.users', compact('users'));
    }

    public function updateRole(Request $request, string $id): RedirectResponse
    {
        $data = $request->validate(['role' => 'required|in:CUSTOMER,ADMIN,PRESCRIBER,DISPENSER']);

        $user = User::findOrFail($id);
        $old  = $user->role->value;
        $user->update(['role' => $data['role']]);

        $this->audit->log(session('user_id'), AuditAction::USER_ROLE_CHANGED, 'users', $id,
            ['role' => $old], ['role' => $data['role']]);

        return back()->with('success', "{$user->full_name}'s role updated to {$data['role']}.");
    }

    public function deactivate(Request $request, string $id): RedirectResponse
    {
        $user = User::findOrFail($id);

        if ($user->id === session('user_id')) {
            return back()->withErrors(['user' => 'You cannot deactivate your own account.']);
        }

        $user->update(['is_active' => !$user->is_active]);

        $action = $user->is_active ? 'activated' : 'deactivated';
        $this->audit->log(session('user_id'), AuditAction::USER_DEACTIVATED, 'users', $id);

        return back()->with('success', "{$user->full_name} has been {$action}.");
    }

    public function prescriptions(Request $request): View
    {
        $query = PrescriptionRequest::with(['customer', 'product'])->orderByDesc('created_at');

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }
        if ($request->filled('search')) {
            $q = $request->input('search');
            $query->whereHas('customer', function ($qb) use ($q) {
                $qb->where('email', 'like', "%{$q}%")
                   ->orWhere('first_name', 'like', "%{$q}%")
                   ->orWhere('last_name', 'like', "%{$q}%");
            });
        }

        $prescriptions = $query->paginate(25)->withQueryString();

        return view('admin.prescriptions', compact('prescriptions'));
    }
}
