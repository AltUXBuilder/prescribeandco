<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Enums\AuditAction;
use App\Services\AuditService;
use App\Services\AuthService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\View\View;

class AuthWebController extends Controller
{
    public function __construct(
        private readonly AuthService  $auth,
        private readonly AuditService $audit,
    ) {}

    public function showLogin(): View
    {
        return view('auth.login');
    }

    public function login(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'email'    => ['required', 'email', 'max:254'],
            'password' => ['required', 'string', 'max:128'],
        ]);

        $user = User::where('email', strtolower(trim($data['email'])))->first();

        // Constant-time check even when user not found
        $dummy = '$2y$12$invalidhashpaddingtomakethisslow0000000000000000000000000';
        $hash  = $user?->password_hash ?? $dummy;

        if (!$user || !Hash::check($data['password'], $hash) || !$user->is_active) {
            return back()->withErrors(['email' => 'Invalid email or password.'])->withInput(['email' => $data['email']]);
        }

        $user->update(['last_login_at' => now()]);

        $request->session()->regenerate();
        $request->session()->put([
            'user_id'   => $user->id,
            'user_role' => $user->role->value,
            'user_name' => $user->full_name,
            'user_email'=> $user->email,
        ]);

        $this->audit->log($user->id, AuditAction::USER_LOGIN, 'users', $user->id);

        $default = match($user->role->value) {
            'ADMIN'      => route('admin.index'),
            'PRESCRIBER' => route('prescriber.queue'),
            'DISPENSER'  => route('dispenser.queue'),
            default      => route('dashboard'),
        };

        $redirect = $request->session()->pull('redirect_url', $default);

        return redirect($redirect);
    }

    public function showRegister(): View
    {
        return view('auth.register');
    }

    public function register(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'first_name'    => ['required', 'string', 'max:100'],
            'last_name'     => ['required', 'string', 'max:100'],
            'email'         => ['required', 'email', 'max:254', 'unique:users,email'],
            'password'      => ['required', 'string', 'min:10', 'confirmed'],
            'date_of_birth' => ['nullable', 'date'],
        ]);

        $user = User::create([
            'email'         => strtolower(trim($data['email'])),
            'password_hash' => Hash::make($data['password'], ['rounds' => 12]),
            'first_name'    => $data['first_name'],
            'last_name'     => $data['last_name'],
            'date_of_birth' => $data['date_of_birth'] ?? null,
            'role'          => 'CUSTOMER',
            'is_active'     => true,
            'is_verified'   => false,
        ]);

        $request->session()->regenerate();
        $request->session()->put([
            'user_id'   => $user->id,
            'user_role' => $user->role->value,
            'user_name' => $user->full_name,
            'user_email'=> $user->email,
        ]);

        $this->audit->log($user->id, AuditAction::USER_REGISTERED, 'users', $user->id);

        return redirect()->route('dashboard')->with('success', 'Account created. Welcome to Prescribe & Co.');
    }

    public function logout(Request $request): RedirectResponse
    {
        $userId = $request->session()->get('user_id');
        if ($userId) {
            $this->audit->log($userId, AuditAction::USER_LOGOUT, 'users', $userId);
        }

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }
}
