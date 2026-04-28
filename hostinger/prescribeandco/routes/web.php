<?php

use App\Http\Controllers\Web\AuthWebController;
use App\Http\Controllers\Web\ConditionWebController;
use App\Http\Controllers\Web\ConsultationWebController;
use App\Http\Controllers\Web\DashboardController;
use App\Http\Controllers\Web\HomeController;
use App\Http\Controllers\Web\ProductWebController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
| Session-based routes for the Blade/PHP frontend.
| Auth routes use throttling to mitigate credential-stuffing.
| Protected routes use web.auth middleware (session check).
*/

// ── Public ──────────────────────────────────────────────────────────────
Route::get('/', [HomeController::class, 'index'])->name('home');

Route::get('/treatments', [ProductWebController::class, 'index'])->name('products.index');
Route::get('/treatments/{slug}', [ProductWebController::class, 'show'])->name('products.show');

Route::get('/conditions/{slug}', [ConditionWebController::class, 'show'])->name('condition.show');

// ── Auth (guest only) ───────────────────────────────────────────────────
Route::middleware('web.guest')->group(function () {
    Route::get('/login',    [AuthWebController::class, 'showLogin'])->name('login');
    Route::post('/login',   [AuthWebController::class, 'login'])->middleware('throttle:5,1');

    Route::get('/register', [AuthWebController::class, 'showRegister'])->name('register');
    Route::post('/register',[AuthWebController::class, 'register'])->middleware('throttle:10,1');
});

Route::post('/logout', [AuthWebController::class, 'logout'])->name('logout');

// ── Consultation (must be logged in) ────────────────────────────────────
Route::middleware('web.auth')->group(function () {
    Route::get('/consultation/start', [ConsultationWebController::class, 'start'])->name('consultation.start');
    Route::post('/consultation/submit', [ConsultationWebController::class, 'submit'])->name('consultation.submit');
});

// ── Dashboard (must be logged in) ───────────────────────────────────────
Route::middleware('web.auth')->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/dashboard/prescriptions/{id}', [DashboardController::class, 'prescription'])->name('dashboard.prescription');
    Route::post('/dashboard/prescriptions/{id}/cancel', [DashboardController::class, 'cancel'])->name('prescription.cancel');
});
