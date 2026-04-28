@extends('layouts.app')
@section('title', 'Review Prescription')

@section('content')
<div style="background:var(--white);border-bottom:1px solid var(--border);padding:2.5rem 0">
  <div class="container">
    <a href="{{ route('prescriber.queue') }}" style="font-size:.875rem;color:var(--charcoal-muted);display:inline-flex;align-items:center;gap:.4rem;margin-bottom:1rem">← Back to queue</a>
    <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap">
      <h1 style="font-size:1.5rem">{{ $rx->product->name ?? 'Prescription' }}</h1>
      {!! statusBadge($rx->status->value) !!}
    </div>
    <p class="text-muted text-sm" style="margin-top:.4rem">
      Submitted {{ $rx->submitted_at?->format('j F Y \a\t H:i') ?? '—' }}
      @if($rx->reviewed_at) · Claimed {{ $rx->reviewed_at->diffForHumans() }} @endif
    </p>
  </div>
</div>

<div class="section">
  <div class="container" style="display:grid;grid-template-columns:1fr 380px;gap:2rem;align-items:start" class="rx-review-grid">

    {{-- Left: patient + questionnaire --}}
    <div style="display:flex;flex-direction:column;gap:1.25rem">

      {{-- Patient --}}
      <div class="card card-pad">
        <h3 style="font-size:1rem;margin-bottom:1rem">Patient</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem">
          <div><p class="text-sm" style="font-weight:600;color:var(--charcoal-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.2rem">Name</p><p>{{ $rx->customer->full_name ?? '—' }}</p></div>
          <div><p class="text-sm" style="font-weight:600;color:var(--charcoal-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.2rem">Email</p><p>{{ $rx->customer->email ?? '—' }}</p></div>
          <div><p class="text-sm" style="font-weight:600;color:var(--charcoal-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.2rem">Date of Birth</p><p>{{ $rx->customer->date_of_birth?->format('d M Y') ?? '—' }}</p></div>
          <div><p class="text-sm" style="font-weight:600;color:var(--charcoal-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.2rem">NHS Number</p><p>{{ $rx->customer->nhs_number ?? '—' }}</p></div>
          @if($rx->customer->phone ?? null)
          <div><p class="text-sm" style="font-weight:600;color:var(--charcoal-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.2rem">Phone</p><p>{{ $rx->customer->phone }}</p></div>
          @endif
          <div><p class="text-sm" style="font-weight:600;color:var(--charcoal-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.2rem">Account created</p><p>{{ $rx->customer->created_at?->format('d M Y') ?? '—' }}</p></div>
        </div>
      </div>

      {{-- Customer note --}}
      @if($rx->customer_note)
      <div class="card card-pad">
        <h3 style="font-size:1rem;margin-bottom:.75rem">Patient note</h3>
        <p>{{ $rx->customer_note }}</p>
      </div>
      @endif

      {{-- Questionnaire answers --}}
      @if($rx->questionnaireResponse && $rx->questionnaireResponse->answers)
      @php
        $questionMap = [];
        foreach ($rx->questionnaireResponse->questionnaire?->schema['questions'] ?? [] as $q) {
            $questionMap[$q['id']] = $q['text'];
        }
      @endphp
      <div class="card card-pad">
        <h3 style="font-size:1rem;margin-bottom:1rem">Consultation answers</h3>
        @foreach($rx->questionnaireResponse->answers as $key => $value)
        <div style="padding:.6rem 0;border-bottom:1px solid var(--border)">
          <p style="font-size:.8rem;font-weight:600;color:var(--charcoal-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.25rem">{{ $questionMap[$key] ?? str_replace('_', ' ', $key) }}</p>
          <p style="font-size:.95rem">{{ is_array($value) ? implode(', ', $value) : $value }}</p>
        </div>
        @endforeach
        @if($rx->questionnaireResponse->is_eligible === false)
          <div class="alert alert-error" style="margin-top:1rem">
            <strong>Flagged ineligible by system</strong>
            @if($rx->questionnaireResponse->ineligibility_reasons)
              <ul style="margin:.4rem 0 0 1.1rem">
                @foreach($rx->questionnaireResponse->ineligibility_reasons as $r)
                  <li>{{ $r }}</li>
                @endforeach
              </ul>
            @endif
          </div>
        @endif
      </div>
      @endif

      {{-- Order history --}}
      @if($orderHistory->isNotEmpty())
      <div class="card card-pad">
        <h3 style="font-size:1rem;margin-bottom:1rem">Previous requests</h3>
        <table style="width:100%;font-size:.875rem;border-collapse:collapse">
          <thead>
            <tr style="border-bottom:2px solid var(--border)">
              <th style="text-align:left;padding:.4rem .5rem;font-weight:600;color:var(--charcoal-muted);font-size:.75rem;text-transform:uppercase;letter-spacing:.04em">Treatment</th>
              <th style="text-align:left;padding:.4rem .5rem;font-weight:600;color:var(--charcoal-muted);font-size:.75rem;text-transform:uppercase;letter-spacing:.04em">Status</th>
              <th style="text-align:left;padding:.4rem .5rem;font-weight:600;color:var(--charcoal-muted);font-size:.75rem;text-transform:uppercase;letter-spacing:.04em">Date</th>
            </tr>
          </thead>
          <tbody>
            @foreach($orderHistory as $hist)
            <tr style="border-bottom:1px solid var(--border)">
              <td style="padding:.5rem">{{ $hist->product->name ?? '—' }}</td>
              <td style="padding:.5rem">{!! statusBadge($hist->status->value) !!}</td>
              <td style="padding:.5rem;color:var(--charcoal-muted)">{{ $hist->submitted_at?->format('d M Y') ?? '—' }}</td>
            </tr>
            @endforeach
          </tbody>
        </table>
      </div>
      @endif

    </div>

    {{-- Right: actions --}}
    <div style="display:flex;flex-direction:column;gap:1.25rem">

      @if(session('success'))
        <div class="alert alert-success">{{ session('success') }}</div>
      @endif

      @if($rx->status->value === 'SUBMITTED')
      {{-- Claim --}}
      <div class="card card-pad">
        <h3 style="font-size:1rem;margin-bottom:.75rem">Claim for review</h3>
        <p class="text-muted text-sm" style="margin-bottom:1rem">Take ownership of this prescription to begin your clinical review.</p>
        <form method="POST" action="{{ route('prescriber.claim', $rx->id) }}">
          @csrf
          <button class="btn btn-primary btn-sm" style="width:100%">Claim prescription →</button>
        </form>
      </div>
      @endif

      @if($rx->status->value === 'UNDER_REVIEW' && $rx->prescriber_id === session('user_id'))

      {{-- Approve --}}
      <div class="card card-pad">
        <h3 style="font-size:1rem;margin-bottom:1rem;color:#1a7a3c">✓ Approve</h3>
        <form method="POST" action="{{ route('prescriber.approve', $rx->id) }}">
          @csrf
          <div style="display:flex;flex-direction:column;gap:.75rem">
            <div>
              <label style="font-size:.85rem;font-weight:600;display:block;margin-bottom:.3rem">Dosage instructions <span style="color:var(--red)">*</span></label>
              <textarea name="dosage_instructions" rows="2" required style="width:100%;padding:.5rem .75rem;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:.9rem;resize:vertical" placeholder="e.g. Take one tablet daily with water">{{ old('dosage_instructions') }}</textarea>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem">
              <div>
                <label style="font-size:.85rem;font-weight:600;display:block;margin-bottom:.3rem">Quantity <span style="color:var(--red)">*</span></label>
                <input type="number" name="quantity_dispensed" min="1" max="9999" required value="{{ old('quantity_dispensed', 28) }}" style="width:100%;padding:.5rem .75rem;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:.9rem">
              </div>
              <div>
                <label style="font-size:.85rem;font-weight:600;display:block;margin-bottom:.3rem">Expiry date <span style="color:var(--red)">*</span></label>
                <input type="date" name="expiry_date" required value="{{ old('expiry_date', now()->addMonths(3)->toDateString()) }}" style="width:100%;padding:.5rem .75rem;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:.9rem">
              </div>
            </div>
            <div>
              <label style="font-size:.85rem;font-weight:600;display:block;margin-bottom:.3rem">Clinical note <span class="text-muted">(optional)</span></label>
              <textarea name="prescriber_note" rows="2" style="width:100%;padding:.5rem .75rem;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:.9rem;resize:vertical" placeholder="Internal clinical notes…">{{ old('prescriber_note') }}</textarea>
            </div>
            @if($errors->any())
              <div class="alert alert-error">{{ $errors->first() }}</div>
            @endif
            <button type="submit" class="btn btn-sm" style="background:#1a7a3c;color:#fff;width:100%">Approve prescription</button>
          </div>
        </form>
      </div>

      {{-- Request more info --}}
      <div class="card card-pad">
        <h3 style="font-size:1rem;margin-bottom:1rem;color:var(--charcoal)">? Request more info</h3>
        <form method="POST" action="{{ route('prescriber.requestInfo', $rx->id) }}">
          @csrf
          <textarea name="prescriber_note" rows="3" required minlength="10" style="width:100%;padding:.5rem .75rem;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:.9rem;resize:vertical;margin-bottom:.75rem" placeholder="Describe what additional information you need from the patient…"></textarea>
          <button type="submit" class="btn btn-secondary btn-sm" style="width:100%">Save note</button>
        </form>
      </div>

      {{-- Reject --}}
      <div class="card card-pad" style="border-color:var(--red)">
        <h3 style="font-size:1rem;margin-bottom:1rem;color:var(--red)">✕ Reject</h3>
        <form method="POST" action="{{ route('prescriber.reject', $rx->id) }}" onsubmit="return confirm('Reject this prescription? This cannot be undone.')">
          @csrf
          <div style="display:flex;flex-direction:column;gap:.75rem">
            <div>
              <label style="font-size:.85rem;font-weight:600;display:block;margin-bottom:.3rem">Reason for rejection <span style="color:var(--red)">*</span></label>
              <textarea name="rejection_reason" rows="3" required minlength="10" style="width:100%;padding:.5rem .75rem;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:.9rem;resize:vertical" placeholder="Explain why this prescription cannot be approved…"></textarea>
            </div>
            <div>
              <label style="font-size:.85rem;font-weight:600;display:block;margin-bottom:.3rem">Internal note <span class="text-muted">(optional)</span></label>
              <textarea name="prescriber_note" rows="2" style="width:100%;padding:.5rem .75rem;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:.9rem;resize:vertical"></textarea>
            </div>
            <button type="submit" class="btn btn-sm" style="background:var(--red);color:#fff;width:100%">Reject prescription</button>
          </div>
        </form>
      </div>

      @endif

      @if($rx->status->value === 'APPROVED')
        <div class="alert alert-success">This prescription has been approved and sent to the dispensing queue.</div>
      @endif
      @if($rx->status->value === 'DISPENSING')
        <div class="alert alert-info">This prescription is currently being dispensed.</div>
      @endif
      @if($rx->status->value === 'FULFILLED')
        <div class="alert alert-success">This prescription has been fulfilled and dispatched to the patient.</div>
      @endif
      @if($rx->status->value === 'REJECTED')
        <div class="alert alert-error"><strong>Rejected.</strong> {{ $rx->rejection_reason }}</div>
      @endif
      @if($rx->status->value === 'CANCELLED')
        <div class="alert alert-warning">This prescription was cancelled by the patient.</div>
      @endif

      {{-- Prescription details if approved --}}
      @if(in_array($rx->status->value, ['APPROVED','DISPENSING','FULFILLED']))
      <div class="card card-pad">
        <h3 style="font-size:1rem;margin-bottom:1rem">Prescription details</h3>
        <div style="display:flex;flex-direction:column;gap:.6rem">
          <div><p class="text-sm" style="font-weight:600;color:var(--charcoal-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.15rem">Dosage</p><p>{{ $rx->dosage_instructions }}</p></div>
          <div><p class="text-sm" style="font-weight:600;color:var(--charcoal-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.15rem">Quantity</p><p>{{ $rx->quantity_dispensed }}</p></div>
          <div><p class="text-sm" style="font-weight:600;color:var(--charcoal-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.15rem">Valid until</p><p>{{ $rx->expiry_date?->format('d M Y') }}</p></div>
          @if($rx->prescriber_note)
          <div><p class="text-sm" style="font-weight:600;color:var(--charcoal-muted);text-transform:uppercase;letter-spacing:.04em;margin-bottom:.15rem">Clinical note</p><p>{{ $rx->prescriber_note }}</p></div>
          @endif
        </div>
      </div>
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
