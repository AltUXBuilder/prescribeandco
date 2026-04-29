@extends('layouts.app')
@section('title', 'Dispensing Queue')

@section('content')
<div style="background:var(--white);border-bottom:1px solid var(--border);padding:2.5rem 0">
  <div class="container">
    <p style="font-size:.72rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--lavender-deep);margin-bottom:.25rem">Dispenser Portal</p>
    <h1 style="font-size:1.75rem;margin-bottom:.25rem">Dispensing Queue</h1>
    <p class="text-muted">Logged in as {{ session('user_name') }}</p>
    <div style="display:flex;gap:.75rem;margin-top:1rem;flex-wrap:wrap">
      <a href="{{ route('orders.index') }}" class="btn btn-secondary btn-sm">📦 All Orders</a>
    </div>
  </div>
</div>

<div class="section">
  <div class="container">

    @if(session('success'))
      <div class="alert alert-success" style="margin-bottom:1.5rem">{{ session('success') }}</div>
    @endif

    {{-- My in-progress --}}
    @if($mine->isNotEmpty())
    <div style="margin-bottom:2.5rem">
      <div class="section-header" style="margin-bottom:1rem">
        <h2 style="font-size:1.1rem">In my queue <span style="background:var(--lavender-soft);color:var(--lavender-deep);font-size:.75rem;padding:.15rem .5rem;border-radius:99px;margin-left:.5rem">{{ $mine->total() }}</span></h2>
      </div>
      <div class="card" style="overflow:hidden">
        <table class="rx-table">
          <thead><tr><th>Patient</th><th>Treatment</th><th>Dosage</th><th>Qty</th><th>Claimed</th><th></th></tr></thead>
          <tbody>
            @foreach($mine as $rx)
            <tr>
              <td><strong>{{ $rx->customer->full_name ?? '—' }}</strong></td>
              <td>{{ $rx->product->name ?? '—' }}</td>
              <td class="text-sm">{{ $rx->dosage_instructions ?? '—' }}</td>
              <td class="text-sm">{{ $rx->quantity_dispensed ?? '—' }}</td>
              <td class="text-muted text-sm">{{ $rx->dispensing_started_at?->diffForHumans() ?? '—' }}</td>
              <td><a href="{{ route('dispenser.show', $rx->id) }}" class="btn btn-primary btn-sm">Fulfil →</a></td>
            </tr>
            @endforeach
          </tbody>
        </table>
      </div>
    </div>
    @endif

    {{-- Approved queue --}}
    <div>
      <div class="section-header" style="margin-bottom:1rem">
        <h2 style="font-size:1.1rem">Ready to dispense <span style="background:var(--lavender-soft);color:var(--lavender-deep);font-size:.75rem;padding:.15rem .5rem;border-radius:99px;margin-left:.5rem">{{ $approved->total() }}</span></h2>
      </div>
      @if($approved->isEmpty())
        <div class="card card-pad text-center" style="padding:3rem">
          <p style="font-size:1.25rem;margin-bottom:.5rem">Queue is clear</p>
          <p class="text-muted">No approved prescriptions awaiting dispensing.</p>
        </div>
      @else
        <div class="card" style="overflow:hidden">
          <table class="rx-table">
            <thead><tr><th>Patient</th><th>Treatment</th><th>Dosage</th><th>Qty</th><th>Approved</th><th></th></tr></thead>
            <tbody>
              @foreach($approved as $rx)
              <tr>
                <td><strong>{{ $rx->customer->full_name ?? '—' }}</strong></td>
                <td>{{ $rx->product->name ?? '—' }}</td>
                <td class="text-sm">{{ $rx->dosage_instructions ?? '—' }}</td>
                <td class="text-sm">{{ $rx->quantity_dispensed ?? '—' }}</td>
                <td class="text-muted text-sm">{{ $rx->approved_at?->format('d M Y') ?? '—' }}</td>
                <td>
                  <form method="POST" action="{{ route('dispenser.claim', $rx->id) }}" style="display:inline">
                    @csrf
                    <button class="btn btn-secondary btn-sm">Claim</button>
                  </form>
                </td>
              </tr>
              @endforeach
            </tbody>
          </table>
        </div>
        <div style="margin-top:1rem">{{ $approved->links('components.pagination') }}</div>
      @endif
    </div>

  </div>
</div>
@endsection
