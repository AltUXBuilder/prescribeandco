@extends('layouts.app')
@section('title', 'Order ' . strtoupper(substr($order->id, 0, 8)))

@section('content')
<div style="background:var(--white);border-bottom:1px solid var(--border);padding:2.5rem 0">
  <div class="container">
    <a href="{{ route('orders.index') }}" style="font-size:.875rem;color:var(--charcoal-muted);display:inline-flex;align-items:center;gap:.4rem;margin-bottom:1rem">← All orders</a>
    <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap">
      <h1 style="font-size:1.5rem;font-family:monospace">{{ strtoupper(substr($order->id, 0, 8)) }}</h1>
      {!! statusBadge($order->status->value) !!}
    </div>
    <p class="text-muted text-sm" style="margin-top:.4rem">
      Full ID: <code style="font-size:.8rem">{{ $order->id }}</code>
      · This view has been logged in the audit trail.
    </p>
  </div>
</div>

<div class="section">
  <div class="container" style="display:grid;grid-template-columns:1fr 1fr;gap:2rem" class="order-detail-grid">

    {{-- Left column --}}
    <div style="display:flex;flex-direction:column;gap:1.25rem">

      {{-- Patient --}}
      <div class="card card-pad">
        <h3 style="font-size:1rem;margin-bottom:1rem">👤 Patient information</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem">
          <div><p class="text-sm" style="font-weight:600;color:var(--charcoal-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.2rem">Full name</p><p>{{ $order->customer->full_name ?? '—' }}</p></div>
          <div><p class="text-sm" style="font-weight:600;color:var(--charcoal-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.2rem">Email</p><p style="font-size:.9rem">{{ $order->customer->email ?? '—' }}</p></div>
          <div><p class="text-sm" style="font-weight:600;color:var(--charcoal-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.2rem">Date of birth</p><p>{{ $order->customer->date_of_birth?->format('d M Y') ?? '—' }}</p></div>
          <div><p class="text-sm" style="font-weight:600;color:var(--charcoal-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.2rem">NHS number</p><p>{{ $order->customer->nhs_number ?? '—' }}</p></div>
          <div><p class="text-sm" style="font-weight:600;color:var(--charcoal-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.2rem">Phone</p><p>{{ $order->customer->phone ?? '—' }}</p></div>
        </div>
      </div>

      {{-- Product --}}
      <div class="card card-pad">
        <h3 style="font-size:1rem;margin-bottom:1rem">💊 Product details</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem">
          <div style="grid-column:span 2"><p class="text-sm" style="font-weight:600;color:var(--charcoal-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.2rem">Product</p><p>{{ $order->product->name ?? '—' }}</p></div>
          <div><p class="text-sm" style="font-weight:600;color:var(--charcoal-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.2rem">Category</p><p>{{ $order->product?->category?->name ?? '—' }}</p></div>
          <div><p class="text-sm" style="font-weight:600;color:var(--charcoal-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.2rem">Medicine type</p><p>{{ $order->product?->medicine_type?->value ?? '—' }}</p></div>
          @if($order->product?->bnf_code)
          <div><p class="text-sm" style="font-weight:600;color:var(--charcoal-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.2rem">BNF code</p><p><code>{{ $order->product->bnf_code }}</code></p></div>
          @endif
        </div>
      </div>

      {{-- Questionnaire answers --}}
      @if($order->questionnaireResponse && $order->questionnaireResponse->answers)
      <div class="card card-pad">
        <h3 style="font-size:1rem;margin-bottom:1rem">📋 Consultation answers</h3>
        @foreach($order->questionnaireResponse->answers as $key => $value)
        <div style="padding:.55rem 0;border-bottom:1px solid var(--border)">
          <p style="font-size:.8rem;font-weight:600;color:var(--charcoal-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.2rem">{{ str_replace('_',' ',$key) }}</p>
          <p style="font-size:.9rem">{{ is_array($value) ? implode(', ',$value) : $value }}</p>
        </div>
        @endforeach
        @if($order->questionnaireResponse->is_eligible === false)
          <div class="alert alert-error" style="margin-top:1rem">
            <strong>Flagged ineligible</strong>
            @if($order->questionnaireResponse->ineligibility_reasons)
              <ul style="margin:.4rem 0 0 1rem">
                @foreach($order->questionnaireResponse->ineligibility_reasons as $r)<li>{{ $r }}</li>@endforeach
              </ul>
            @endif
          </div>
        @endif
      </div>
      @endif

      {{-- Customer note --}}
      @if($order->customer_note)
      <div class="card card-pad">
        <h3 style="font-size:1rem;margin-bottom:.75rem">Patient note</h3>
        <p>{{ $order->customer_note }}</p>
      </div>
      @endif

    </div>

    {{-- Right column --}}
    <div style="display:flex;flex-direction:column;gap:1.25rem">

      {{-- Timeline --}}
      <div class="card card-pad">
        <h3 style="font-size:1rem;margin-bottom:1rem">📅 Timeline</h3>
        @php
          $timeline = [
            ['label' => 'Created',    'date' => $order->created_at],
            ['label' => 'Submitted',  'date' => $order->submitted_at],
            ['label' => 'Under review','date' => $order->reviewed_at],
            ['label' => 'Approved',   'date' => $order->approved_at],
            ['label' => 'Dispensing', 'date' => $order->dispensing_started_at],
            ['label' => 'Fulfilled',  'date' => $order->fulfilled_at],
            ['label' => 'Cancelled',  'date' => $order->cancelled_at],
          ];
        @endphp
        @foreach($timeline as $event)
          @if($event['date'])
          <div style="display:flex;gap:.75rem;align-items:flex-start;padding:.4rem 0;border-bottom:1px solid var(--border)">
            <div style="width:8px;height:8px;border-radius:50%;background:var(--lavender-deep);flex-shrink:0;margin-top:.45rem"></div>
            <div>
              <p style="font-size:.85rem;font-weight:600">{{ $event['label'] }}</p>
              <p class="text-muted text-sm">{{ $event['date']->format('d M Y \a\t H:i') }}</p>
            </div>
          </div>
          @endif
        @endforeach
      </div>

      {{-- Prescriber --}}
      <div class="card card-pad">
        <h3 style="font-size:1rem;margin-bottom:1rem">🩺 Prescriber details</h3>
        @if($prescriber)
          <div style="display:flex;flex-direction:column;gap:.6rem">
            <div><p class="text-sm" style="font-weight:600;color:var(--charcoal-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.15rem">Name</p><p>{{ $prescriber->full_name }}</p></div>
            <div><p class="text-sm" style="font-weight:600;color:var(--charcoal-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.15rem">Email</p><p style="font-size:.9rem">{{ $prescriber->email }}</p></div>
            @if($prescriberProfile)
            <div><p class="text-sm" style="font-weight:600;color:var(--charcoal-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.15rem">GPhC number</p>
              <p><code style="background:var(--lavender-soft);padding:.15rem .5rem;border-radius:4px;font-size:.9rem;color:var(--lavender-deep)">{{ $prescriberProfile->gphc_number }}</code></p>
            </div>
            @if($prescriberProfile->organisation)
            <div><p class="text-sm" style="font-weight:600;color:var(--charcoal-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.15rem">Organisation</p><p>{{ $prescriberProfile->organisation }}</p></div>
            @endif
            @endif
          </div>
        @else
          <p class="text-muted text-sm">Not yet assigned.</p>
        @endif
      </div>

      {{-- Prescription details --}}
      @if($order->dosage_instructions)
      <div class="card card-pad">
        <h3 style="font-size:1rem;margin-bottom:1rem">📄 Prescription</h3>
        <div style="display:flex;flex-direction:column;gap:.6rem">
          <div><p class="text-sm" style="font-weight:600;color:var(--charcoal-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.15rem">Dosage</p><p>{{ $order->dosage_instructions }}</p></div>
          <div><p class="text-sm" style="font-weight:600;color:var(--charcoal-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.15rem">Quantity</p><p>{{ $order->quantity_dispensed }}</p></div>
          @if($order->expiry_date)<div><p class="text-sm" style="font-weight:600;color:var(--charcoal-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.15rem">Valid until</p><p>{{ $order->expiry_date->format('d M Y') }}</p></div>@endif
          @if($order->prescriber_note)<div><p class="text-sm" style="font-weight:600;color:var(--charcoal-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.15rem">Clinical note</p><p>{{ $order->prescriber_note }}</p></div>@endif
        </div>
      </div>
      @endif

      {{-- Dispenser --}}
      @if($dispenser)
      <div class="card card-pad">
        <h3 style="font-size:1rem;margin-bottom:1rem">📦 Dispensing</h3>
        <div style="display:flex;flex-direction:column;gap:.6rem">
          <div><p class="text-sm" style="font-weight:600;color:var(--charcoal-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.15rem">Dispenser</p><p>{{ $dispenser->full_name }}</p></div>
          @if($order->tracking_number)
          <div><p class="text-sm" style="font-weight:600;color:var(--charcoal-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.15rem">Tracking</p><p>{{ $order->courier_name }} — {{ $order->tracking_number }}</p></div>
          @endif
        </div>
      </div>
      @endif

      {{-- Rejection --}}
      @if($order->status->value === 'REJECTED')
      <div class="alert alert-error">
        <strong>Rejected</strong>
        @if($order->rejection_reason)<p style="margin-top:.4rem">{{ $order->rejection_reason }}</p>@endif
      </div>
      @endif

    </div>

  </div>
</div>

@push('head')
<style>
  @media (max-width: 900px) { .order-detail-grid { grid-template-columns: 1fr !important; } }
</style>
@endpush
@endsection
