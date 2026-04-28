<?php

namespace App\Http\Controllers\Web;

use App\Enums\AuditAction;
use App\Enums\PrescriptionStatus;
use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Payment;
use App\Models\PrescriberProfile;
use App\Models\PrescriptionRequest;
use App\Models\Product;
use App\Models\Questionnaire;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\View\View;

class AdminWebController extends Controller
{
    public function __construct(private readonly AuditService $audit) {}

    // ── Dashboard ────────────────────────────────────────────────────────────

    public function index(): View
    {
        $stats = [
            'total_users'     => User::count(),
            'customers'       => User::where('role', Role::CUSTOMER)->count(),
            'prescribers'     => User::where('role', Role::PRESCRIBER)->count(),
            'dispensers'      => User::where('role', Role::DISPENSER)->count(),
            'pending_review'  => PrescriptionRequest::whereIn('status', [
                PrescriptionStatus::SUBMITTED, PrescriptionStatus::UNDER_REVIEW,
            ])->count(),
            'approved_today'  => PrescriptionRequest::where('status', PrescriptionStatus::APPROVED)
                ->whereDate('approved_at', today())->count(),
            'fulfilled_total' => PrescriptionRequest::where('status', PrescriptionStatus::FULFILLED)->count(),
            'revenue_pence'   => Payment::where('status', 'CAPTURED')->sum('amount_pence'),
        ];

        $recentPrescriptions = PrescriptionRequest::with(['customer', 'product'])
            ->orderByDesc('created_at')->limit(8)->get();

        $recentUsers = User::orderByDesc('created_at')->limit(6)->get();

        return view('admin.index', compact('stats', 'recentPrescriptions', 'recentUsers'));
    }

    // ── Users ────────────────────────────────────────────────────────────────

    public function users(Request $request): View
    {
        $query = User::with('prescriberProfile')->orderByDesc('created_at');

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

    public function createUser(): View
    {
        return view('admin.users.create');
    }

    public function storeUser(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'first_name'  => 'required|string|max:100',
            'last_name'   => 'required|string|max:100',
            'email'       => 'required|email|max:254|unique:users,email',
            'password'    => 'required|string|min:10|confirmed',
            'role'        => 'required|in:ADMIN,PRESCRIBER,DISPENSER',
            'gphc_number' => 'required_if:role,PRESCRIBER|nullable|string|size:7',
            'organisation'=> 'nullable|string|max:200',
            'specialisation' => 'nullable|string|max:200',
        ]);

        $user = User::create([
            'email'         => strtolower(trim($data['email'])),
            'password_hash' => Hash::make($data['password'], ['rounds' => 12]),
            'first_name'    => $data['first_name'],
            'last_name'     => $data['last_name'],
            'role'          => $data['role'],
            'is_active'     => true,
            'is_verified'   => true,
        ]);

        if ($data['role'] === 'PRESCRIBER') {
            PrescriberProfile::create([
                'user_id'        => $user->id,
                'gphc_number'    => $data['gphc_number'],
                'organisation'   => $data['organisation'] ?? null,
                'specialisation' => $data['specialisation'] ?? null,
                'gphc_verified'  => false,
            ]);
        }

        $this->audit->log(session('user_id'), AuditAction::USER_REGISTERED, 'users', $user->id,
            null, ['role' => $data['role'], 'email' => $user->email]);

        return redirect()->route('admin.users')
            ->with('success', "{$user->full_name} ({$data['role']}) created successfully.");
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

        $this->audit->log(session('user_id'), AuditAction::USER_DEACTIVATED, 'users', $id,
            null, ['is_active' => $user->is_active]);

        return back()->with('success', "{$user->full_name} has been {$action}.");
    }

    // ── Prescriptions ────────────────────────────────────────────────────────

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

    // ── Products ─────────────────────────────────────────────────────────────

    public function products(Request $request): View
    {
        $query = Product::with('category')->orderByDesc('created_at');

        if ($request->filled('search')) {
            $q = $request->input('search');
            $query->where(function ($qb) use ($q) {
                $qb->where('name', 'like', "%{$q}%")->orWhere('bnf_code', 'like', "%{$q}%");
            });
        }
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }
        if ($request->filled('category')) {
            $query->where('category_id', $request->input('category'));
        }

        $products   = $query->paginate(25)->withQueryString();
        $categories = Category::orderBy('name')->get();

        return view('admin.products.index', compact('products', 'categories'));
    }

    public function createProduct(): View
    {
        $categories     = Category::orderBy('name')->get();
        $questionnaires = Questionnaire::where('is_active', true)->orderBy('title')->get();
        return view('admin.products.form', ['product' => null, 'categories' => $categories, 'questionnaires' => $questionnaires]);
    }

    public function storeProduct(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name'                  => 'required|string|max:200',
            'slug'                  => 'required|string|max:220|unique:products,slug|regex:/^[a-z0-9\-]+$/',
            'description'           => 'nullable|string',
            'category_id'           => 'nullable|exists:categories,id',
            'questionnaire_id'      => 'nullable|exists:questionnaires,id',
            'bnf_code'              => 'nullable|string|max:20',
            'medicine_type'         => 'required|in:POM,P,GSL',
            'requires_prescription' => 'boolean',
            'requires_questionnaire'=> 'boolean',
            'price_pounds'          => 'required|numeric|min:0|max:9999',
            'status'                => 'required|in:ACTIVE,INACTIVE',
            'stock_count'           => 'nullable|integer|min:0',
        ]);

        $product = Product::create([
            'name'                  => $data['name'],
            'slug'                  => $data['slug'],
            'description'           => $data['description'] ?? null,
            'category_id'           => $data['category_id'] ?? null,
            'questionnaire_id'      => $data['questionnaire_id'] ?? null,
            'bnf_code'              => $data['bnf_code'] ?? null,
            'medicine_type'         => $data['medicine_type'],
            'requires_prescription' => $request->boolean('requires_prescription'),
            'requires_questionnaire'=> $request->boolean('requires_questionnaire'),
            'price_pence'           => (int) round($data['price_pounds'] * 100),
            'status'                => $data['status'],
            'stock_count'           => $data['stock_count'] ?? null,
        ]);

        $this->audit->log(session('user_id'), AuditAction::PRODUCT_CREATED, 'products', $product->id,
            null, ['name' => $product->name, 'status' => $product->status->value]);

        return redirect()->route('admin.products')->with('success', 'Product "' . $product->name . '" created.');
    }

    public function editProduct(string $id): View
    {
        $product        = Product::findOrFail($id);
        $categories     = Category::orderBy('name')->get();
        $questionnaires = Questionnaire::where('is_active', true)->orderBy('title')->get();
        return view('admin.products.form', compact('product', 'categories', 'questionnaires'));
    }

    public function updateProduct(Request $request, string $id): RedirectResponse
    {
        $product = Product::findOrFail($id);

        $data = $request->validate([
            'name'                  => 'required|string|max:200',
            'slug'                  => "required|string|max:220|unique:products,slug,{$id}|regex:/^[a-z0-9\-]+$/",
            'description'           => 'nullable|string',
            'category_id'           => 'nullable|exists:categories,id',
            'questionnaire_id'      => 'nullable|exists:questionnaires,id',
            'bnf_code'              => 'nullable|string|max:20',
            'medicine_type'         => 'required|in:POM,P,GSL',
            'requires_prescription' => 'boolean',
            'requires_questionnaire'=> 'boolean',
            'price_pounds'          => 'required|numeric|min:0|max:9999',
            'status'                => 'required|in:ACTIVE,INACTIVE,ARCHIVED',
            'stock_count'           => 'nullable|integer|min:0',
        ]);

        $before = $product->only(['name', 'status', 'price_pence', 'stock_count']);

        $product->update([
            'name'                  => $data['name'],
            'slug'                  => $data['slug'],
            'description'           => $data['description'] ?? null,
            'category_id'           => $data['category_id'] ?? null,
            'questionnaire_id'      => $data['questionnaire_id'] ?? null,
            'bnf_code'              => $data['bnf_code'] ?? null,
            'medicine_type'         => $data['medicine_type'],
            'requires_prescription' => $request->boolean('requires_prescription'),
            'requires_questionnaire'=> $request->boolean('requires_questionnaire'),
            'price_pence'           => (int) round($data['price_pounds'] * 100),
            'status'                => $data['status'],
            'stock_count'           => $data['stock_count'] ?? null,
        ]);

        $this->audit->log(session('user_id'), AuditAction::PRODUCT_UPDATED, 'products', $id,
            $before, $product->fresh()->only(['name', 'status', 'price_pence', 'stock_count']));

        return redirect()->route('admin.products')->with('success', 'Product "' . $product->name . '" updated.');
    }

    public function archiveProduct(string $id): RedirectResponse
    {
        $product = Product::findOrFail($id);
        $product->update(['status' => 'ARCHIVED']);

        $this->audit->log(session('user_id'), AuditAction::PRODUCT_ARCHIVED, 'products', $id,
            ['status' => 'ACTIVE'], ['status' => 'ARCHIVED']);

        return back()->with('success', '"' . $product->name . '" has been archived.');
    }
}
