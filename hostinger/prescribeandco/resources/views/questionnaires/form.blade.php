@extends('layouts.app')
@section('title', $questionnaire ? 'Edit Questionnaire' : 'New Questionnaire')

@php
  $isAdmin     = session('user_role') === 'ADMIN';
  $backRoute   = $isAdmin ? 'admin.questionnaires'     : 'prescriber.questionnaires';
  $storeRoute  = $isAdmin ? 'admin.questionnaires.store'  : 'prescriber.questionnaires.store';
  $updateRoute = $isAdmin ? 'admin.questionnaires.update' : 'prescriber.questionnaires.update';
  $existingSchema = $questionnaire ? $questionnaire->schema : ['questions' => []];
@endphp

@section('content')
<div style="background:var(--white);border-bottom:1px solid var(--border);padding:2.5rem 0">
  <div class="container">
    <a href="{{ route($backRoute) }}" style="font-size:.875rem;color:var(--charcoal-muted);display:inline-flex;align-items:center;gap:.4rem;margin-bottom:1rem">← Questionnaires</a>
    <h1 style="font-size:1.75rem">{{ $questionnaire ? 'Edit: ' . $questionnaire->title : 'New questionnaire' }}</h1>
    @if($questionnaire)
      <p class="text-muted text-sm" style="margin-top:.25rem">Version {{ $questionnaire->version }} · Saving will increment to v{{ $questionnaire->version + 1 }}</p>
    @endif
  </div>
</div>

<div class="section">
  <div class="container" style="max-width:860px">

    @if($errors->any())
      <div class="alert alert-error" style="margin-bottom:1.5rem">
        <ul style="margin:.25rem 0 0 1rem">@foreach($errors->all() as $e)<li>{{ $e }}</li>@endforeach</ul>
      </div>
    @endif

    <form method="POST"
          action="{{ $questionnaire ? route($updateRoute, $questionnaire->id) : route($storeRoute) }}"
          id="qForm">
      @csrf
      @if($questionnaire) @method('PUT') @endif
      <input type="hidden" name="schema_json" id="schemaJson">

      <div style="display:flex;flex-direction:column;gap:1.5rem">

        {{-- Meta --}}
        <div class="card card-pad" style="display:flex;flex-direction:column;gap:1rem">
          <div>
            <label class="form-label">Title <span style="color:var(--red)">*</span></label>
            <input type="text" name="title" required class="form-input" value="{{ old('title', $questionnaire->title ?? '') }}">
          </div>
          <div>
            <label class="form-label">Description</label>
            <textarea name="description" rows="2" class="form-input" style="resize:vertical">{{ old('description', $questionnaire->description ?? '') }}</textarea>
          </div>
        </div>

        {{-- Question builder --}}
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
            <h2 style="font-size:1.1rem">Questions</h2>
            <button type="button" onclick="addQuestion()" class="btn btn-secondary btn-sm">+ Add question</button>
          </div>

          <div id="questionList" style="display:flex;flex-direction:column;gap:1rem"></div>

          <div id="emptyState" style="border:2px dashed var(--border);border-radius:var(--radius);padding:2.5rem;text-align:center;color:var(--charcoal-muted)">
            No questions yet. Click "Add question" to start building.
          </div>
        </div>

        <div style="display:flex;gap:.75rem">
          <button type="submit" class="btn btn-primary btn-sm">{{ $questionnaire ? 'Save changes' : 'Create questionnaire' }}</button>
          <a href="{{ route($backRoute) }}" class="btn btn-secondary btn-sm">Cancel</a>
        </div>

      </div>
    </form>
  </div>
</div>

@push('scripts')
<script>
const QUESTION_TYPES = {
  boolean:  'Yes / No',
  text:     'Free text',
  radio:    'Single choice',
  checkbox: 'Multiple choice',
  select:   'Dropdown',
  number:   'Number',
};

let questions = @json($existingSchema['questions'] ?? []);

function render() {
  const list  = document.getElementById('questionList');
  const empty = document.getElementById('emptyState');
  list.innerHTML = '';
  empty.style.display = questions.length ? 'none' : '';

  questions.forEach((q, i) => {
    const hasOptions = ['radio','checkbox','select'].includes(q.type);
    const card = document.createElement('div');
    card.className = 'card card-pad';
    card.style.cssText = 'display:flex;flex-direction:column;gap:.75rem';
    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:.75rem;flex-wrap:wrap">
        <span style="font-size:.75rem;font-weight:700;color:var(--charcoal-muted);min-width:24px">Q${i+1}</span>
        <input type="text" placeholder="Question text…" value="${escHtml(q.label)}"
          style="flex:1;min-width:200px;padding:.45rem .75rem;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:.9rem"
          oninput="questions[${i}].label=this.value">
        <select onchange="changeType(${i},this.value)"
          style="padding:.45rem .6rem;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:.85rem">
          ${Object.entries(QUESTION_TYPES).map(([v,l])=>`<option value="${v}" ${q.type===v?'selected':''}>${l}</option>`).join('')}
        </select>
        <label style="display:flex;align-items:center;gap:.3rem;font-size:.85rem;font-weight:500;white-space:nowrap">
          <input type="checkbox" ${q.required?'checked':''} onchange="questions[${i}].required=this.checked"> Required
        </label>
        <button type="button" onclick="removeQuestion(${i})"
          style="background:none;border:none;color:var(--red);cursor:pointer;font-size:1rem;padding:.2rem .4rem">✕</button>
      </div>
      ${hasOptions ? `
        <div style="padding-left:2rem">
          <p style="font-size:.8rem;font-weight:600;color:var(--charcoal-muted);margin-bottom:.4rem">Options (one per line)</p>
          <textarea rows="3" style="width:100%;padding:.4rem .6rem;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:.85rem;resize:vertical"
            oninput="questions[${i}].options=this.value.split('\\n').map(s=>s.trim()).filter(Boolean)"
          >${escHtml((q.options||[]).join('\n'))}</textarea>
        </div>
      ` : ''}
    `;
    list.appendChild(card);
  });
}

function addQuestion() {
  questions.push({ id: 'q_' + Date.now(), type: 'boolean', label: '', required: true, options: [] });
  render();
}

function removeQuestion(i) {
  questions.splice(i, 1);
  render();
}

function changeType(i, type) {
  questions[i].type = type;
  if (!['radio','checkbox','select'].includes(type)) delete questions[i].options;
  else questions[i].options = questions[i].options || [];
  render();
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

document.getElementById('qForm').addEventListener('submit', function(e) {
  if (questions.length === 0) {
    e.preventDefault();
    alert('Please add at least one question.');
    return;
  }
  document.getElementById('schemaJson').value = JSON.stringify({ questions });
});

render();
</script>
@endpush
@endsection
