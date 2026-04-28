<?php

use App\Http\Controllers\Api\AuditController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\DispenserController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\PrescriberController;
use App\Http\Controllers\Api\PrescriptionController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\QuestionnaireController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — Prescribe & Co
|--------------------------------------------------------------------------
| All routes are prefixed /api/v1 (configured in bootstrap/app.php).
|
| Authentication model:
|   - Public routes: no middleware
|   - Authenticated routes: auth.jwt middleware
|   - Role-restricted: auth.jwt + role:ROLE middleware
|   - Prescribers: auth.jwt + prescriber middleware (includes GPhC checks)
|
| Rate limits (per minute):
|   - Auth endpoints:        5 (throttle:5,1)
|   - Token refresh:        10 (throttle:10,1)
|   - Global default:       20 (throttle:20,1)
*/

// ── Health check (no auth) ─────────────────────────────────────────────────
Route::get('/health', fn() => response()->json(['status' => 'ok', 'service' => 'prescribeandco-api']));

// ── Auth (public, tight rate limits) ──────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('/register',            [AuthController::class, 'register'])
        ->middleware('throttle:5,1');

    Route::post('/register/prescriber', [AuthController::class, 'registerPrescriber'])
        ->middleware('throttle:5,1');

    Route::post('/login',               [AuthController::class, 'login'])
        ->middleware('throttle:5,1');

    Route::post('/refresh',             [AuthController::class, 'refresh'])
        ->middleware('throttle:10,1');

    // Authenticated logout
    Route::post('/logout',              [AuthController::class, 'logout'])
        ->middleware(['auth.jwt', 'throttle:20,1']);

    Route::post('/logout/all',          [AuthController::class, 'logoutAll'])
        ->middleware(['auth.jwt', 'throttle:20,1']);
});

// ── Public catalogue ───────────────────────────────────────────────────────
Route::middleware('throttle:60,1')->group(function () {
    Route::get('/products',              [ProductController::class, 'index']);
    Route::get('/products/slug/{slug}',  [ProductController::class, 'showBySlug']);
    Route::get('/products/{id}',         [ProductController::class, 'show']);
    Route::get('/categories',            [CategoryController::class, 'index']);
    Route::get('/categories/slug/{slug}',[CategoryController::class, 'showBySlug']);
});

// ── Stripe webhook (public, authenticated by signature) ────────────────────
Route::post('/payments/webhook', [PaymentController::class, 'webhook'])
    ->middleware('throttle:60,1');

// ── Authenticated (all roles) ──────────────────────────────────────────────
Route::middleware(['auth.jwt', 'throttle:20,1'])->group(function () {

    // Current user
    Route::get('/users/me',              [UserController::class, 'me']);
    Route::get('/users/me/profile',      [UserController::class, 'myProfile'])
        ->middleware('role:PRESCRIBER');

    // Questionnaire: authenticated users can read + respond
    Route::get('/questionnaires/{id}',   [QuestionnaireController::class, 'show'])
        ->middleware('role:ADMIN,PRESCRIBER');
    Route::post('/questionnaires/{id}/respond', [QuestionnaireController::class, 'respond']);

    // Products: questionnaire lookup requires authentication
    Route::get('/products/{id}/questionnaire', [ProductController::class, 'questionnaire']);

    // Prescriptions (customer)
    Route::prefix('prescriptions')->group(function () {
        Route::get('/',          [PrescriptionController::class, 'index']);
        Route::post('/',         [PrescriptionController::class, 'store']);
        Route::get('/{id}',      [PrescriptionController::class, 'show']);
        Route::post('/{id}/submit',             [PrescriptionController::class, 'submit']);
        Route::post('/{id}/cancel',             [PrescriptionController::class, 'cancel']);
        Route::patch('/{id}/questionnaire-response', [PrescriptionController::class, 'attachQuestionnaire']);

        // Documents
        Route::get('/{prescriptionId}/documents',                    [DocumentController::class, 'index']);
        Route::post('/{prescriptionId}/documents',                   [DocumentController::class, 'store']);
        Route::delete('/{prescriptionId}/documents/{documentId}',   [DocumentController::class, 'destroy']);
    });

    // AV scanner webhook — admin role guards it from external abuse
    Route::post(
        '/prescriptions/{prescriptionId}/documents/{documentId}/scan-result',
        [DocumentController::class, 'scanResult']
    )->middleware('role:ADMIN');
});

// ── Admin only ─────────────────────────────────────────────────────────────
Route::middleware(['auth.jwt', 'role:ADMIN', 'throttle:20,1'])->group(function () {

    // Users
    Route::get('/users/{id}',            [UserController::class, 'show']);
    Route::patch('/users/{id}/role',     [UserController::class, 'updateRole']);
    Route::delete('/users/{id}',         [UserController::class, 'deactivate']);

    // Products (write)
    Route::post('/products',             [ProductController::class, 'store']);
    Route::patch('/products/{id}',       [ProductController::class, 'update']);
    Route::delete('/products/{id}',      [ProductController::class, 'destroy']);

    // Questionnaires (write)
    Route::get('/questionnaires',        [QuestionnaireController::class, 'index']);
    Route::post('/questionnaires',       [QuestionnaireController::class, 'store']);
    Route::patch('/questionnaires/{id}', [QuestionnaireController::class, 'update']);
    Route::delete('/questionnaires/{id}',[QuestionnaireController::class, 'destroy']);

    // Payments (admin read + manual refund)
    Route::get('/payments/{id}',                          [PaymentController::class, 'show']);
    Route::get('/payments/prescription/{prescriptionId}', [PaymentController::class, 'showByPrescription']);
    Route::post('/payments/{id}/refund',                  [PaymentController::class, 'refund']);

    // Audit
    Route::get('/audit',                          [AuditController::class, 'index']);
    Route::get('/audit/prescriptions/{id}/history', [AuditController::class, 'prescriptionHistory']);
    Route::get('/audit/users/{id}/history',       [AuditController::class, 'userHistory']);
});

// ── Prescriber ─────────────────────────────────────────────────────────────
Route::middleware(['auth.jwt', 'prescriber', 'throttle:20,1'])
    ->prefix('prescriber')
    ->group(function () {
        Route::get('/queue',                           [PrescriberController::class, 'queue']);
        Route::get('/prescriptions/{id}',              [PrescriberController::class, 'show']);
        Route::patch('/prescriptions/{id}/claim',      [PrescriberController::class, 'claim']);
        Route::post('/prescriptions/{id}/approve',     [PrescriberController::class, 'approve']);
        Route::post('/prescriptions/{id}/reject',      [PrescriberController::class, 'reject']);
        Route::post('/prescriptions/{id}/request-info',[PrescriberController::class, 'requestInfo']);
    });

// ── Dispenser ──────────────────────────────────────────────────────────────
Route::middleware(['auth.jwt', 'role:DISPENSER', 'throttle:20,1'])
    ->prefix('dispenser')
    ->group(function () {
        Route::get('/queue',                          [DispenserController::class, 'queue']);
        Route::get('/prescriptions/{id}',             [DispenserController::class, 'show']);
        Route::patch('/prescriptions/{id}/claim',     [DispenserController::class, 'claim']);
        Route::patch('/prescriptions/{id}/tracking',  [DispenserController::class, 'updateTracking']);
        Route::post('/prescriptions/{id}/fulfil',     [DispenserController::class, 'fulfil']);
    });
