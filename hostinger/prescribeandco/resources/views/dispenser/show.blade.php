@extends('layouts.app')
@section('title', 'Dispense Prescription')

@section('content')
<div style="background:var(--white);border-bottom:1px solid var(--border);padding:2.5rem 0">
  <div class="container">
    <a href="{{ route('dispenser.queue') }}" style="font-size:.875rem;color:var(--charcoal-muted);display:inline-flex;align-items:center;gap:.4rem;margin-bottom:1rem">← Back to queue</a>
    <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap">
      <h1 style="font-size:1.5rem">{{ $rx->product->name ?? 'Prescription' }}</h1>
      {!! statusBadge($rx->status->value) !!}
    </div>
    <p class="text-muted text-sm" style="margin-top:.4rem">Approved {{ $rx->approved_at?->format('j F Y') ?? '—' }}</p>
  </div>
</div>

<div class="section">
  <div class="container" style="display:grid;grid-template-columns:1fr 380px;gap:2rem;align-items:start" class="rx-review-grid">

    {{-- Left: prescription details --}}
    <div style="display:flex;flex-direction:column;gap:1.25rem">

      <div class="card card-pad">
        <h3 style="font-size:1rem;margin-bottom:1rem">Prescription</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem">
          <div><p class="text-sm" style="font-weight:600;color:var(--charcoal-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.2rem">Treatment</p><p>{{ $rx->product->name ?? '—' }}</p></div>
          <div><p class="text-sm" style="font-weight:600;color:var(--charcoal-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.2rem">Quantity</p><p>{{ $rx->quantity_dispensed ?? '—' }}</p></div>
          <div style="grid-column:span 2"><p class="text-sm" style="font-weight:600;color:var(--charcoal-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.2rem">Dosage instructions</p><p>{{ $rx->dosage_instructions ?? '—' }}</p></div>
          <div><p class="text-sm" style="font-weight:600;color:var(--charcoal-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.2rem">Valid until</p><p>{{ $rx->expiry_date?->format('d M Y') ?? '—' }}</p></div>
          @if($rx->prescriber_note)
          <div><p class="text-sm" style="font-weight:600;color:var(--charcoal-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.2rem">Prescriber note</p><p>{{ $rx->prescriber_note }}</p></div>
          @endif
        </div>
      </div>

      <div class="card card-pad">
        <h3 style="font-size:1rem;margin-bottom:1rem">Patient (delivery)</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem">
          <div><p class="text-sm" style="font-weight:600;color:var(--charcoal-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.2rem">Name</p><p>{{ $rx->customer->full_name ?? '—' }}</p></div>
          <div><p class="text-sm" style="font-weight:600;color:var(--charcoal-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.2rem">NHS Number</p><p>{{ $rx->customer->nhs_number ?? '—' }}</p></div>
        </div>
      </div>

      @if($rx->tracking_number)
      <div class="card card-pad">
        <h3 style="font-size:1rem;margin-bottom:.75rem">Tracking</h3>
        <p><strong>{{ $rx->courier_name }}</strong> — {{ $rx->tracking_number }}</p>
        @if($rx->dispensing_note ?? null) <p class="text-muted text-sm" style="margin-top:.5rem">{{ $rx->dispensing_note }}</p> @endif
      </div>
      @endif

    </div>

    {{-- Right: actions --}}
    <div style="display:flex;flex-direction:column;gap:1.25rem">

      @if(session('success'))
        <div class="alert alert-success">{{ session('success') }}</div>
      @endif

      @if($rx->status->value === 'APPROVED')
      <div class="card card-pad">
        <h3 style="font-size:1rem;margin-bottom:.75rem">Claim for dispensing</h3>
        <p class="text-muted text-sm" style="margin-bottom:1rem">Take ownership of this prescription to begin packaging and dispatch.</p>
        <form method="POST" action="{{ route('dispenser.claim', $rx->id) }}">
          @csrf
          <button class="btn btn-primary btn-sm" style="width:100%">Claim prescription →</button>
        </form>
      </div>
      @endif

      @if($rx->status->value === 'DISPENSING' && $rx->dispenser_id === session('user_id'))
      <div class="card card-pad">
        <h3 style="font-size:1rem;margin-bottom:1rem;color:#1a7a3c">Mark as fulfilled</h3>
        <form method="POST" action="{{ route('dispenser.fulfil', $rx->id) }}">
          @csrf
          <div style="display:flex;flex-direction:column;gap:.75rem">
            <div>
              <label style="font-size:.85rem;font-weight:600;display:block;margin-bottom:.3rem">Courier <span style="color:var(--red)">*</span></label>
              <input type="text" name="courier_name" required value="{{ old('courier_name') }}" placeholder="e.g. Royal Mail, DHL" style="width:100%;padding:.5rem .75rem;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:.9rem">
            </div>
            <div>
              <label style="font-size:.85rem;font-weight:600;display:block;margin-bottom:.3rem">Tracking number <span style="color:var(--red)">*</span></label>
              <input type="text" name="tracking_number" required value="{{ old('tracking_number') }}" placeholder="e.g. JD123456780GB" style="width:100%;padding:.5rem .75rem;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:.9rem">
            </div>
            <div>
              <label style="font-size:.85rem;font-weight:600;display:block;margin-bottom:.3rem">Dispensing note <span class="text-muted">(optional)</span></label>
              <textarea name="dispensing_note" rows="2" style="width:100%;padding:.5rem .75rem;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:.9rem;resize:vertical" placeholder="Any notes for the patient or team…">{{ old('dispensing_note') }}</textarea>
            </div>
            @if($errors->any())
              <div class="alert alert-error">{{ $errors->first() }}</div>
            @endif
            <button type="submit" class="btn btn-sm" style="background:#1a7a3c;color:#fff;width:100%">Mark as dispatched</button>
          </div>
        </form>
      </div>
      @endif

      @if($rx->status->value === 'FULFILLED')
        <div class="alert alert-success"><strong>Fulfilled.</strong> Dispatched via {{ $rx->courier_name }} on {{ $rx->fulfilled_at?->format('d M Y') }}.</div>
      @endif

    </div>
  </div>
</div>

@push('head')
<style>
  @media (max-width: 900px) { .rx-review-grid { grid-template-columns: 1fr !important; } }
</style>
@endpush
@endsection
