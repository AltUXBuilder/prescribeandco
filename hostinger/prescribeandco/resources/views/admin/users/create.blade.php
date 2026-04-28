@extends('layouts.app')
@section('title', 'Create Staff Account — Admin')

@section('content')
<div style="background:var(--white);border-bottom:1px solid var(--border);padding:2.5rem 0">
  <div class="container">
    <a href="{{ route('admin.users') }}" style="font-size:.875rem;color:var(--charcoal-muted);display:inline-flex;align-items:center;gap:.4rem;margin-bottom:1rem">← Users</a>
    <h1 style="font-size:1.75rem">Create staff account</h1>
    <p class="text-muted" style="margin-top:.25rem">Create accounts for Admins, Prescribers and Dispensers. Customers register themselves.</p>
  </div>
</div>

<div class="section">
  <div class="container-sm">

    @if($errors->any())
      <div class="alert alert-error" style="margin-bottom:1.5rem">
        <ul style="margin:.25rem 0 0 1rem">@foreach($errors->all() as $e)<li>{{ $e }}</li>@endforeach</ul>
      </div>
    @endif

    <form method="POST" action="{{ route('admin.users.store') }}">
      @csrf

      <div class="card card-pad" style="display:flex;flex-direction:column;gap:1.25rem">

        {{-- Name --}}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
          <div>
            <label class="form-label">First name <span style="color:var(--red)">*</span></label>
            <input type="text" name="first_name" required class="form-input" value="{{ old('first_name') }}">
          </div>
          <div>
            <label class="form-label">Last name <span style="color:var(--red)">*</span></label>
            <input type="text" name="last_name" required class="form-input" value="{{ old('last_name') }}">
          </div>
        </div>

        {{-- Email --}}
        <div>
          <label class="form-label">Email <span style="color:var(--red)">*</span></label>
          <input type="email" name="email" required class="form-input" value="{{ old('email') }}">
        </div>

        {{-- Role --}}
        <div>
          <label class="form-label">Role <span style="color:var(--red)">*</span></label>
          <select name="role" id="roleSelect" class="form-input" style="max-width:220px" required onchange="togglePrescriberFields(this.value)">
            <option value="">— Select role —</option>
            @foreach(['ADMIN','PRESCRIBER','DISPENSER'] as $r)
              <option value="{{ $r }}" @selected(old('role') === $r)>{{ $r }}</option>
            @endforeach
          </select>
        </div>

        {{-- Prescriber fields (shown when role = PRESCRIBER) --}}
        <div id="prescriberFields" style="{{ old('role') === 'PRESCRIBER' ? '' : 'display:none' }}">
          <div style="background:var(--lavender-soft);border:1px solid var(--lavender);border-radius:var(--radius-sm);padding:1.25rem;display:flex;flex-direction:column;gap:1rem">
            <p style="font-size:.8rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--lavender-deep);margin-bottom:-.25rem">Prescriber details</p>
            <div>
              <label class="form-label">GPhC number <span style="color:var(--red)">*</span></label>
              <input type="text" name="gphc_number" id="gphcInput" class="form-input" style="max-width:160px"
                     maxlength="7" pattern="[0-9]{7}" value="{{ old('gphc_number') }}"
                     placeholder="7 digits">
              <p class="form-hint">7-digit GPhC registration number. Stored securely and included in all audit logs for compliance.</p>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
              <div>
                <label class="form-label">Organisation</label>
                <input type="text" name="organisation" class="form-input" value="{{ old('organisation') }}" placeholder="e.g. Prescribe & Co Ltd">
              </div>
              <div>
                <label class="form-label">Specialisation</label>
                <input type="text" name="specialisation" class="form-input" value="{{ old('specialisation') }}" placeholder="e.g. General Practice">
              </div>
            </div>
          </div>
        </div>

        {{-- Password --}}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
          <div>
            <label class="form-label">Password <span style="color:var(--red)">*</span></label>
            <input type="password" name="password" required minlength="10" class="form-input">
            <p class="form-hint">Minimum 10 characters</p>
          </div>
          <div>
            <label class="form-label">Confirm password <span style="color:var(--red)">*</span></label>
            <input type="password" name="password_confirmation" required class="form-input">
          </div>
        </div>

        <div style="display:flex;gap:.75rem;padding-top:.5rem">
          <button type="submit" class="btn btn-primary btn-sm">Create account</button>
          <a href="{{ route('admin.users') }}" class="btn btn-secondary btn-sm">Cancel</a>
        </div>

      </div>
    </form>
  </div>
</div>

@push('scripts')
<script>
function togglePrescriberFields(role) {
  const el    = document.getElementById('prescriberFields');
  const input = document.getElementById('gphcInput');
  const show  = role === 'PRESCRIBER';
  el.style.display = show ? '' : 'none';
  input.required   = show;
}
</script>
@endpush
@endsection
