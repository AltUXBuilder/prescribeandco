<?php

use App\Http\Controllers\Web\AdminWebController;
use App\Http\Controllers\Web\AuthWebController;
use App\Http\Controllers\Web\ConditionWebController;
use App\Http\Controllers\Web\ConsultationWebController;
use App\Http\Controllers\Web\DashboardController;
use App\Http\Controllers\Web\DispenserWebController;
use App\Http\Controllers\Web\HomeController;
use App\Http\Controllers\Web\OrdersWebController;
use App\Http\Controllers\Web\PrescriberWebController;
use App\Http\Controllers\Web\ProductWebController;
use App\Http\Controllers\Web\QuestionnaireWebController;
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

// ── Customer dashboard ───────────────────────────────────────────────────
Route::middleware('web.auth')->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/dashboard/prescriptions/{id}', [DashboardController::class, 'prescription'])->name('dashboard.prescription');
    Route::post('/dashboard/prescriptions/{id}/cancel', [DashboardController::class, 'cancel'])->name('prescription.cancel');
});

// ── Prescriber dashboard ─────────────────────────────────────────────────
Route::middleware(['web.auth', 'web.role:PRESCRIBER'])->prefix('prescriber')->name('prescriber.')->group(function () {
    Route::get('/',                              [PrescriberWebController::class, 'queue'])->name('queue');
    Route::get('/prescriptions/{id}',            [PrescriberWebController::class, 'show'])->name('show');
    Route::post('/prescriptions/{id}/claim',     [PrescriberWebController::class, 'claim'])->name('claim');
    Route::post('/prescriptions/{id}/approve',   [PrescriberWebController::class, 'approve'])->name('approve');
    Route::post('/prescriptions/{id}/reject',    [PrescriberWebController::class, 'reject'])->name('reject');
    Route::post('/prescriptions/{id}/info',      [PrescriberWebController::class, 'requestInfo'])->name('requestInfo');
    // Questionnaires
    Route::get('/questionnaires',                [QuestionnaireWebController::class, 'index'])->name('questionnaires');
    Route::get('/questionnaires/create',         [QuestionnaireWebController::class, 'create'])->name('questionnaires.create');
    Route::post('/questionnaires',               [QuestionnaireWebController::class, 'store'])->name('questionnaires.store');
    Route::get('/questionnaires/{id}/edit',      [QuestionnaireWebController::class, 'edit'])->name('questionnaires.edit');
    Route::put('/questionnaires/{id}',           [QuestionnaireWebController::class, 'update'])->name('questionnaires.update');
});

// ── Dispenser dashboard ──────────────────────────────────────────────────
Route::middleware(['web.auth', 'web.role:DISPENSER'])->prefix('dispenser')->name('dispenser.')->group(function () {
    Route::get('/',                              [DispenserWebController::class, 'queue'])->name('queue');
    Route::get('/prescriptions/{id}',            [DispenserWebController::class, 'show'])->name('show');
    Route::post('/prescriptions/{id}/claim',     [DispenserWebController::class, 'claim'])->name('claim');
    Route::post('/prescriptions/{id}/fulfil',    [DispenserWebController::class, 'fulfil'])->name('fulfil');
});

// ── Admin dashboard ──────────────────────────────────────────────────────
Route::middleware(['web.auth', 'web.role:ADMIN'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/',                              [AdminWebController::class, 'index'])->name('index');
    Route::get('/users',                         [AdminWebController::class, 'users'])->name('users');
    Route::get('/users/create',                  [AdminWebController::class, 'createUser'])->name('users.create');
    Route::post('/users',                        [AdminWebController::class, 'storeUser'])->name('users.store');
    Route::post('/users/{id}/role',              [AdminWebController::class, 'updateRole'])->name('users.role');
    Route::post('/users/{id}/toggle-active',     [AdminWebController::class, 'deactivate'])->name('users.toggle');
    Route::get('/prescriptions',                 [AdminWebController::class, 'prescriptions'])->name('prescriptions');
    // Products
    Route::get('/products',                      [AdminWebController::class, 'products'])->name('products');
    Route::get('/products/create',               [AdminWebController::class, 'createProduct'])->name('products.create');
    Route::post('/products',                     [AdminWebController::class, 'storeProduct'])->name('products.store');
    Route::get('/products/{id}/edit',            [AdminWebController::class, 'editProduct'])->name('products.edit');
    Route::put('/products/{id}',                 [AdminWebController::class, 'updateProduct'])->name('products.update');
    Route::post('/products/{id}/archive',        [AdminWebController::class, 'archiveProduct'])->name('products.archive');
    // Questionnaires
    Route::get('/questionnaires',                [QuestionnaireWebController::class, 'index'])->name('questionnaires');
    Route::get('/questionnaires/create',         [QuestionnaireWebController::class, 'create'])->name('questionnaires.create');
    Route::post('/questionnaires',               [QuestionnaireWebController::class, 'store'])->name('questionnaires.store');
    Route::get('/questionnaires/{id}/edit',      [QuestionnaireWebController::class, 'edit'])->name('questionnaires.edit');
    Route::put('/questionnaires/{id}',           [QuestionnaireWebController::class, 'update'])->name('questionnaires.update');
    Route::post('/questionnaires/{id}/toggle',   [QuestionnaireWebController::class, 'toggleActive'])->name('questionnaires.toggle');
});

// ── Shared staff orders view ─────────────────────────────────────────────
Route::middleware(['web.auth', 'web.role:ADMIN,PRESCRIBER,DISPENSER'])->name('orders.')->group(function () {
    Route::get('/orders',      [OrdersWebController::class, 'index'])->name('index');
    Route::get('/orders/{id}', [OrdersWebController::class, 'show'])->name('show');
});
