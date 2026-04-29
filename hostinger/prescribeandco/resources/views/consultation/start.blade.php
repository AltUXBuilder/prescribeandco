@extends('layouts.app')
@section('title', 'Consultation — ' . $product->name)

@section('content')
<div style="min-height:calc(100vh - 130px);display:flex;flex-direction:column;justify-content:center;padding:3rem 1rem">
  <div class="container-sm">

    @if($questionnaire)
      <div style="text-align:center;margin-bottom:2rem">
        <p style="font-size:.75rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--charcoal-muted)">Consultation for</p>
        <h1 style="font-size:1.5rem">{{ $product->name }}</h1>
      </div>

      @if(!session('user_id'))
        <div style="background:var(--lavender-soft);border:1px solid var(--lavender-deep);border-radius:var(--radius);padding:.875rem 1.25rem;margin-bottom:1.5rem;font-size:.9rem;color:var(--charcoal)">
          You'll be asked to sign in or create an account before submitting your consultation. Your answers will be saved.
        </div>
      @endif

      @if(session('info'))
        <div class="alert alert-success" style="margin-bottom:1.5rem">{{ session('info') }}</div>
      @endif

      {{-- Progress bar --}}
      <div class="progress-bar" id="progressBar">
        <div class="progress-bar-fill" id="progressFill" style="width:0%"></div>
      </div>

      <form method="POST" action="{{ route('consultation.submit') }}" id="consultationForm">
        @csrf
        <input type="hidden" name="product_id" value="{{ $product->id }}">
        <input type="hidden" name="questionnaire_id" value="{{ $questionnaire->id }}">

        @php $questions = $questionnaire->schema['questions'] ?? []; @endphp

        @foreach($questions as $i => $q)
          <div class="question-block" id="q-{{ $q['id'] }}"
               data-question-id="{{ $q['id'] }}"
               @if(!empty($q['showIf']))
                 data-show-if="{{ json_encode($q['showIf']) }}"
               @else
                 data-visible="true"
               @endif>

            <p class="question-text">
              {{ $q['text'] }}
              @if(!empty($q['isRequired'])) <span style="color:var(--red)"> *</span> @endif
            </p>
            @if(!empty($q['hint']))
              <p class="question-hint">{{ $q['hint'] }}</p>
            @endif

            {{-- Render by type --}}
            @switch($q['type'])
              @case('BOOLEAN')
                <div class="choice-list">
                  @foreach([['value' => '1', 'label' => 'Yes'], ['value' => '0', 'label' => 'No']] as $opt)
                    <div class="choice-item">
                      <label>
                        <input type="radio" name="answers[{{ $q['id'] }}]" value="{{ $opt['value'] }}"
                               onchange="updateVisibility()">
                        <span>{{ $opt['label'] }}</span>
                      </label>
                    </div>
                  @endforeach
                </div>
                @break

              @case('SINGLE_CHOICE')
                <div class="choice-list">
                  @foreach($q['options'] ?? [] as $opt)
                    <div class="choice-item">
                      <label>
                        <input type="radio" name="answers[{{ $q['id'] }}]" value="{{ $opt['value'] }}"
                               onchange="updateVisibility()">
                        <span>{{ $opt['label'] }}</span>
                      </label>
                    </div>
                  @endforeach
                </div>
                @break

              @case('MULTI_CHOICE')
                <div class="choice-list">
                  @foreach($q['options'] ?? [] as $opt)
                    <div class="choice-item">
                      <label>
                        <input type="checkbox" name="answers[{{ $q['id'] }}][]" value="{{ $opt['value'] }}">
                        <span>{{ $opt['label'] }}</span>
                      </label>
                    </div>
                  @endforeach
                </div>
                @break

              @case('SCALE')
                <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap">
                  <span class="text-sm text-muted">{{ $q['scale']['minLabel'] ?? $q['scale']['min'] }}</span>
                  <input type="range" name="answers[{{ $q['id'] }}]"
                         min="{{ $q['scale']['min'] ?? 0 }}" max="{{ $q['scale']['max'] ?? 10 }}"
                         style="flex:1;accent-color:var(--lavender-deep)" oninput="this.nextElementSibling.textContent=this.value">
                  <span class="text-sm text-muted">{{ $q['scale']['maxLabel'] ?? $q['scale']['max'] }}</span>
                  <span style="font-weight:700;min-width:2rem;text-align:center">—</span>
                </div>
                @break

              @case('DATE')
                <input class="form-input" type="date" name="answers[{{ $q['id'] }}]"
                       @if(!empty($q['isRequired'])) required @endif>
                @break

              @default
                <input class="form-input" type="text" name="answers[{{ $q['id'] }}]"
                       placeholder="{{ $q['hint'] ?? '' }}"
                       @if(!empty($q['isRequired'])) required @endif>
            @endswitch

          </div>
        @endforeach

        @if($errors->any())
          <div class="alert alert-error">
            @foreach($errors->all() as $error) <div>{{ $error }}</div> @endforeach
          </div>
        @endif

        <button type="submit" class="btn btn-primary btn-full btn-lg" style="margin-top:1.5rem">
          Submit consultation
        </button>
        <p class="text-sm text-muted text-center mt-1">
          Your answers are reviewed by a registered prescriber. All information is confidential.
        </p>
      </form>

    @else
      <div class="card card-pad text-center" style="padding:3rem">
        <h2>No consultation required</h2>
        <p class="text-muted mt-1">This product does not require a consultation.</p>
        <a href="{{ route('products.index') }}" class="btn btn-secondary btn-sm" style="margin-top:1.25rem;display:inline-flex">Browse treatments</a>
      </div>
    @endif

  </div>
</div>
@endsection

@push('scripts')
<script>
const questions = document.querySelectorAll('.question-block[data-show-if]');

function getAnswerMap() {
  const map = {};
  document.querySelectorAll('[name^="answers["]').forEach(el => {
    const match = el.name.match(/answers\[([^\]]+)\]/);
    if (!match) return;
    const id = match[1];
    if (el.type === 'checkbox') {
      if (el.checked) { map[id] = [...(map[id] || []), el.value]; }
    } else if (el.type === 'radio') {
      if (el.checked) map[id] = el.value;
    } else {
      map[id] = el.value;
    }
  });
  return map;
}

function evaluateCondition(rule, answers) {
  const actual = answers[rule.questionId];
  const value  = rule.value;
  switch (rule.operator) {
    case 'eq':     return actual === value;
    case 'neq':    return actual !== value;
    case 'in':     return Array.isArray(value) && value.includes(actual);
    case 'not_in': return Array.isArray(value) && !value.includes(actual);
    default:       return true;
  }
}

function updateVisibility() {
  const answers = getAnswerMap();
  let visible = 0, total = document.querySelectorAll('.question-block').length;

  questions.forEach(block => {
    const rule = JSON.parse(block.dataset.showIf);
    const show = evaluateCondition(rule, answers);
    block.dataset.hidden = show ? 'false' : 'true';
    block.style.display = show ? '' : 'none';
    block.querySelectorAll('input, select, textarea').forEach(field => {
      field.disabled = !show;
    });
    if (show) visible++;
  });

  // Update progress bar
  const answered = Object.keys(answers).length;
  document.getElementById('progressFill').style.width = Math.round((answered / total) * 100) + '%';
}

updateVisibility();
</script>
@endpush
