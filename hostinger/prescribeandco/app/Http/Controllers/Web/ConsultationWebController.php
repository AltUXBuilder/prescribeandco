<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\PrescriptionRequest;
use App\Models\QuestionnaireResponse;
use App\Enums\AuditAction;
use App\Enums\PrescriptionStatus;
use App\Services\AuditService;
use App\Services\EligibilityCalculator;
use App\Services\QuestionnaireValidator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class ConsultationWebController extends Controller
{
    public function __construct(
        private readonly QuestionnaireValidator $validator,
        private readonly EligibilityCalculator  $eligibility,
        private readonly AuditService           $audit,
    ) {}

    public function start(Request $request): View
    {
        $slug = (string) $request->query('product', '');

        abort_if($slug === '', 404);

        $product = Product::where('slug', $slug)
            ->where('status', 'ACTIVE')
            ->with('questionnaire')
            ->firstOrFail();

        $questionnaire = ($product->questionnaire && $product->questionnaire->is_active)
            ? $product->questionnaire
            : null;

        return view('consultation.start', compact('product', 'questionnaire'));
    }

    public function resume(Request $request): RedirectResponse
    {
        $pending = $request->session()->pull('pending_consultation');

        if (!$pending) {
            return redirect()->route('products.index');
        }

        $request->merge($pending);
        return $this->submit($request);
    }

    public function submit(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'product_id'       => ['required', 'exists:products,id'],
            'questionnaire_id' => ['required', 'exists:questionnaires,id'],
            'answers'          => ['required', 'array'],
        ]);

        $customerId = $request->session()->get('user_id');

        // Guest: save consultation to session and redirect to auth
        if (!$customerId) {
            $request->session()->put('pending_consultation', [
                'product_id'       => $data['product_id'],
                'questionnaire_id' => $data['questionnaire_id'],
                'answers'          => $data['answers'],
            ]);
            return redirect()->route('register')
                ->with('info', 'Please sign in or create an account to submit your consultation.');
        }

        $product = Product::findOrFail($data['product_id']);
        if ($product->status->value !== 'ACTIVE') {
            return back()->withErrors(['product_id' => 'This product is not available.']);
        }

        // Sanitise answers — only allow scalar/array values
        $answers = [];
        foreach ($data['answers'] as $key => $value) {
            $key = preg_replace('/[^a-zA-Z0-9_\-]/', '', (string) $key);
            if (is_array($value)) {
                $answers[$key] = array_map('strval', array_values($value));
            } else {
                $answers[$key] = (string) $value;
            }
        }

        // Validate answers and compute eligibility via server-side schema rules
        $questionnaire    = \App\Models\Questionnaire::findOrFail($data['questionnaire_id']);
        $validationResult = $this->validator->validate($questionnaire->schema, $answers);

        if (!empty($validationResult['errors'])) {
            return back()->withErrors(['answers' => $validationResult['errors']])->withInput();
        }

        // Save questionnaire response with eligibility pre-computed
        $response = QuestionnaireResponse::create([
            'questionnaire_id'       => $questionnaire->id,
            'questionnaire_version'  => $questionnaire->version ?? 1,
            'user_id'                => $customerId,
            'answers'                => $answers,
            'is_eligible'            => $validationResult['is_eligible'],
            'ineligibility_reasons'  => $validationResult['ineligibility_reasons'],
            'submitted_at'           => now(),
        ]);

        // Convert stored eligibility into a prescription eligibility status
        $eligibilityResult = $this->eligibility->calculate($response);

        // Create prescription request
        $prescription = PrescriptionRequest::create([
            'customer_id'               => $customerId,
            'product_id'                => $product->id,
            'questionnaire_response_id' => $response->id,
            'status'                    => PrescriptionStatus::SUBMITTED->value,
            'eligibility_status'        => $eligibilityResult['status']->value,
            'eligibility_notes'         => $eligibilityResult['notes'] ?? [],
            'submitted_at'              => now(),
        ]);

        $this->audit->log(
            $customerId,
            AuditAction::PRESCRIPTION_SUBMITTED,
            'prescription_requests',
            $prescription->id,
            null,
            ['product_id' => $product->id, 'eligibility' => $eligibilityResult['status']->value],
        );

        return redirect()->route('dashboard.prescription', $prescription->id)
            ->with('success', 'Consultation submitted. A prescriber will review your answers.');
    }
}
