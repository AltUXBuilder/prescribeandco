<?php

namespace App\Http\Controllers\Web;

use App\Enums\AuditAction;
use App\Http\Controllers\Controller;
use App\Models\PrescriberProfile;
use App\Models\PrescriptionRequest;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\View\View;

class OrdersWebController extends Controller
{
    public function __construct(private readonly AuditService $audit) {}

    public function index(Request $request): View
    {
        $query = PrescriptionRequest::with(['customer', 'product', 'product.category'])
            ->orderByDesc('created_at');

        if ($request->filled('search')) {
            $q = $request->input('search');
            $query->where(function ($qb) use ($q) {
                $qb->whereHas('customer', function ($cb) use ($q) {
                    $cb->where('email', 'like', "%{$q}%")
                       ->orWhere('first_name', 'like', "%{$q}%")
                       ->orWhere('last_name', 'like', "%{$q}%")
                       ->orWhere('nhs_number', 'like', "%{$q}%");
                })->orWhereHas('product', function ($pb) use ($q) {
                    $pb->where('name', 'like', "%{$q}%");
                })->orWhere('id', 'like', "{$q}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $orders = $query->paginate(25)->withQueryString();

        $this->audit->log(
            session('user_id'), AuditAction::PRESCRIPTION_VIEWED,
            'prescription_requests', null,
            null, null,
            ['action' => 'list_view', 'filters' => $request->only(['search', 'status']), 'result_count' => $orders->count()],
            session('user_role'),
            $this->actorGphc()
        );

        return view('orders.index', compact('orders'));
    }

    public function show(string $id): View
    {
        $order = PrescriptionRequest::with([
            'customer', 'product', 'product.category', 'questionnaireResponse',
        ])->findOrFail($id);

        $prescriber        = $order->prescriber_id ? User::find($order->prescriber_id) : null;
        $prescriberProfile = $prescriber ? PrescriberProfile::where('user_id', $prescriber->id)->first() : null;

        $dispenser = $order->dispenser_id ? User::find($order->dispenser_id) : null;

        $this->audit->log(
            session('user_id'), AuditAction::PRESCRIPTION_VIEWED,
            'prescription_requests', $id,
            null, null,
            ['action' => 'full_detail_view'],
            session('user_role'),
            $this->actorGphc()
        );

        return view('orders.show', compact('order', 'prescriber', 'prescriberProfile', 'dispenser'));
    }

    private function actorGphc(): ?string
    {
        if (session('user_role') !== 'PRESCRIBER') {
            return null;
        }
        return PrescriberProfile::where('user_id', session('user_id'))->value('gphc_number');
    }
}
