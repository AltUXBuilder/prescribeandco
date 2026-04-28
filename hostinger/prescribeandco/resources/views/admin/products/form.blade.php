@extends('layouts.app')
@section('title', $product ? 'Edit Product — Admin' : 'New Product — Admin')

@section('content')
<div style="background:var(--white);border-bottom:1px solid var(--border);padding:2.5rem 0">
  <div class="container">
    <a href="{{ route('admin.products') }}" style="font-size:.875rem;color:var(--charcoal-muted);display:inline-flex;align-items:center;gap:.4rem;margin-bottom:1rem">← Products</a>
    <h1 style="font-size:1.75rem">{{ $product ? 'Edit: ' . $product->name : 'Add product' }}</h1>
  </div>
</div>

<div class="section">
  <div class="container-sm">

    @if($errors->any())
      <div class="alert alert-error" style="margin-bottom:1.5rem">
        <ul style="margin:.25rem 0 0 1rem">@foreach($errors->all() as $e)<li>{{ $e }}</li>@endforeach</ul>
      </div>
    @endif

    <form method="POST"
          action="{{ $product ? route('admin.products.update', $product->id) : route('admin.products.store') }}">
      @csrf
      @if($product) @method('PUT') @endif

      <div class="card card-pad" style="display:flex;flex-direction:column;gap:1.25rem">

        {{-- Name + slug --}}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
          <div>
            <label class="form-label">Name <span style="color:var(--red)">*</span></label>
            <input id="nameInput" type="text" name="name" required class="form-input"
                   value="{{ old('name', $product->name ?? '') }}" oninput="autoSlug(this.value)">
          </div>
          <div>
            <label class="form-label">Slug <span style="color:var(--red)">*</span></label>
            <input id="slugInput" type="text" name="slug" required class="form-input"
                   value="{{ old('slug', $product->slug ?? '') }}" placeholder="auto-generated">
            <p class="form-hint">Lowercase letters, numbers, hyphens only</p>
          </div>
        </div>

        {{-- Description --}}
        <div>
          <label class="form-label">Description</label>
          <textarea name="description" rows="3" class="form-input" style="resize:vertical">{{ old('description', $product->description ?? '') }}</textarea>
        </div>

        {{-- Category + medicine type --}}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
          <div>
            <label class="form-label">Category</label>
            <select name="category_id" class="form-input">
              <option value="">— None —</option>
              @foreach($categories as $cat)
                <option value="{{ $cat->id }}" @selected(old('category_id', $product->category_id ?? '') === $cat->id)>{{ $cat->name }}</option>
              @endforeach
            </select>
          </div>
          <div>
            <label class="form-label">Medicine type <span style="color:var(--red)">*</span></label>
            <select name="medicine_type" class="form-input" required>
              @foreach(['POM' => 'POM — Prescription Only', 'P' => 'P — Pharmacy', 'GSL' => 'GSL — General Sales'] as $val => $label)
                <option value="{{ $val }}" @selected(old('medicine_type', $product->medicine_type->value ?? 'GSL') === $val)>{{ $label }}</option>
              @endforeach
            </select>
          </div>
        </div>

        {{-- BNF code --}}
        <div>
          <label class="form-label">BNF Code</label>
          <input type="text" name="bnf_code" class="form-input" style="max-width:200px"
                 value="{{ old('bnf_code', $product->bnf_code ?? '') }}" placeholder="e.g. 0407010A0">
        </div>

        {{-- Price + stock --}}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
          <div>
            <label class="form-label">Price (£) <span style="color:var(--red)">*</span></label>
            <input type="number" name="price_pounds" class="form-input" required step="0.01" min="0" max="9999"
                   value="{{ old('price_pounds', isset($product) ? number_format($product->price_pence / 100, 2) : '') }}">
          </div>
          <div>
            <label class="form-label">Stock count</label>
            <input type="number" name="stock_count" class="form-input" min="0"
                   value="{{ old('stock_count', $product->stock_count ?? '') }}" placeholder="Leave blank = unlimited">
          </div>
        </div>

        {{-- Status --}}
        <div>
          <label class="form-label">Status <span style="color:var(--red)">*</span></label>
          <select name="status" class="form-input" style="max-width:200px" required>
            @foreach($product ? ['ACTIVE','INACTIVE','ARCHIVED'] : ['ACTIVE','INACTIVE'] as $s)
              <option value="{{ $s }}" @selected(old('status', $product->status->value ?? 'ACTIVE') === $s)>{{ $s }}</option>
            @endforeach
          </select>
        </div>

        {{-- Flags --}}
        <div style="display:flex;gap:2rem;flex-wrap:wrap">
          <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;font-size:.9rem;font-weight:500">
            <input type="checkbox" name="requires_prescription" value="1"
                   @checked(old('requires_prescription', $product->requires_prescription ?? false))>
            Requires prescription
          </label>
          <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;font-size:.9rem;font-weight:500" id="reqQLabel">
            <input type="checkbox" name="requires_questionnaire" value="1" id="reqQCheck"
                   @checked(old('requires_questionnaire', $product->requires_questionnaire ?? false))
                   onchange="toggleQuestionnaire(this.checked)">
            Requires questionnaire
          </label>
        </div>

        {{-- Questionnaire selector (shown when requires_questionnaire is checked) --}}
        <div id="questionnaireRow" style="{{ old('requires_questionnaire', $product->requires_questionnaire ?? false) ? '' : 'display:none' }}">
          <label class="form-label">Linked questionnaire</label>
          <select name="questionnaire_id" class="form-input">
            <option value="">— Select questionnaire —</option>
            @foreach($questionnaires as $q)
              <option value="{{ $q->id }}" @selected(old('questionnaire_id', $product->questionnaire_id ?? '') === $q->id)>
                {{ $q->title }} (v{{ $q->version }})
              </option>
            @endforeach
          </select>
        </div>

        <div style="display:flex;gap:.75rem;padding-top:.5rem">
          <button type="submit" class="btn btn-primary btn-sm">{{ $product ? 'Save changes' : 'Create product' }}</button>
          <a href="{{ route('admin.products') }}" class="btn btn-secondary btn-sm">Cancel</a>
        </div>

      </div>
    </form>
  </div>
</div>

@push('scripts')
<script>
function autoSlug(name) {
  // Only auto-fill when creating (slug field is empty or was auto-generated)
  const slug = document.getElementById('slugInput');
  if (slug.dataset.manual === '1') return;
  slug.value = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
document.getElementById('slugInput').addEventListener('input', function() {
  this.dataset.manual = '1';
});
function toggleQuestionnaire(checked) {
  document.getElementById('questionnaireRow').style.display = checked ? '' : 'none';
}
</script>
@endpush
@endsection
