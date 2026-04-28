@extends('layouts.app')
@section('title', 'Prescription — ' . ($prescription->product->name ?? ''))

@section('content')
<div style="background:var(--white);border-bottom:1px solid var(--border);padding:2.5rem 0">
  <div class="container">
    <a href="{{ route('dashboard') }}" style="font-size:.875rem;color:var(--charcoal-muted);display:inline-flex;align-items:center;gap:.4rem;margin-bottom:1.25rem">← Back to dashboard</a>
    <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap">
      <h1 style="font-size:1.5rem">{{ $prescription->product->name ?? 'Prescription' }}</h1>
      {!! statusBadge($prescription->status->value) !!}
    </div>
    @if($prescription->submitted_at)
      <p class="text-muted text-sm mt-1">Submitted {{ $prescription->submitted_at->format('j F Y \a\t H:i') }}</p>
    @endif
  </div>
</div>

<div class="section">
  <div class="container-sm">

    {{-- Status timeline --}}
    @php
      $steps = [
        ['status' => 'SUBMITTED',    'label' => 'Submitted'],
        ['status' => 'UNDER_REVIEW', 'label' => 'Under Review'],
        ['status' => 'APPROVED',     'label' => 'Approved'],
        ['status' => 'DISPENSING',   'label' => 'Dispatched'],
        ['status' => 'FULFILLED',    'label' => 'Delivered'],
      ];
      $currentIdx = array_search($prescription->status->value, array_column($steps, 'status'));
    @endphp
    @if(!in_array($prescription->status->value, ['REJECTED','CANCELLED','EXPIRED']))
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2rem;overflow-x:auto;gap:0;padding-bottom:.5rem">
        @foreach($steps as $i => $step)
          @php $done = $currentIdx !== false && $i <= $currentIdx; @endphp
          <div style="display:flex;flex-direction:column;align-items:center;flex:1;min-width:60px;position:relative">
            <div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;background:{{ $done ? 'var(--sage)' : 'var(--border)' }};color:{{ $done ? '#fff' : 'var(--charcoal-muted)' }};z-index:1">
              {{ $done ? '✓' : ($i + 1) }}
            </div>
            <span style="font-size:.7rem;margin-top:.35rem;color:{{ $done ? 'var(--charcoal)' : 'var(--charcoal-muted)' }};font-weight:{{ $done ? '600' : '400' }};text-align:center">{{ $step['label'] }}</span>
            @if($i < count($steps) - 1)
              <div style="position:absolute;top:14px;left:50%;width:100%;height:2px;background:{{ $done && $currentIdx > $i ? 'var(--sage)' : 'var(--border)' }};z-index:0"></div>
            @endif
          </div>
        @endforeach
      </div>
    @endif

    {{-- Detail cards --}}
    <div style="display:flex;flex-direction:column;gap:1rem">

      {{-- Rejection / cancellation notice --}}
      @if($prescription->status->value === 'REJECTED')
        <div class="alert alert-error">
          <strong>Prescription not approved</strong>
          @if($prescription->rejection_reason)
            <p style="margin-top:.4rem">{{ $prescription->rejection_reason }}</p>
          @endif
        </div>
      @elseif($prescription->status->value === 'CANCELLED')
        <div class="alert alert-warning"><strong>Prescription cancelled</strong></div>
      @endif

      {{-- Prescription details --}}
      <div class="card card-pad">
        <h3 style="margin-bottom:1rem;font-size:1rem">Prescription details</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem">
          @if($prescription->dosage_instructions)
            <div><p class="text-sm" style="font-weight:600;color:var(--charcoal-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.25rem">Dosage</p><p>{{ $prescription->dosage_instructions }}</p></div>
          @endif
          @if($prescription->expiry_date)
            <div><p class="text-sm" style="font-weight:600;color:var(--charcoal-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.25rem">Valid until</p><p>{{ $prescription->expiry_date->format('d M Y') }}</p></div>
          @endif
          @if($prescription->tracking_number)
            <div><p class="text-sm" style="font-weight:600;color:var(--charcoal-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.25rem">Tracking</p><p>{{ $prescription->courier_name }} — {{ $prescription->tracking_number }}</p></div>
          @endif
        </div>
        @if(!$prescription->dosage_instructions && !$prescription->expiry_date)
          <p class="text-muted text-sm">Details will appear once your prescription is approved.</p>
        @endif
      </div>

      {{-- Customer note --}}
      @if($prescription->customer_note)
        <div class="card card-pad">
          <h3 style="margin-bottom:.75rem;font-size:1rem">Your note</h3>
          <p>{{ $prescription->customer_note }}</p>
        </div>
      @endif

      {{-- Actions --}}
      @if($prescription->is_cancellable)
        <form method="POST" action="{{ route('prescription.cancel', $prescription->id) }}"
              onsubmit="return confirm('Are you sure you want to cancel this prescription request?')">
          @csrf
          <input type="hidden" name="reason" value="Cancelled by customer">
          <button type="submit" class="btn btn-secondary btn-sm" style="color:var(--red);border-color:var(--red)">
            Cancel prescription request
          </button>
        </form>
      @endif

    </div>
  </div>
</div>
@endsection
