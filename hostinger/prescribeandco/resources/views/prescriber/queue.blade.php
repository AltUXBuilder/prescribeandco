@extends('layouts.app')
@section('title', 'Prescriber Queue')

@section('content')
<div style="background:var(--white);border-bottom:1px solid var(--border);padding:2.5rem 0">
  <div class="container">
    <p style="font-size:.72rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--lavender-deep);margin-bottom:.25rem">Prescriber Portal</p>
    <h1 style="font-size:1.75rem;margin-bottom:.25rem">Review Queue</h1>
    <p class="text-muted">Logged in as {{ session('user_name') }}</p>
    <div style="display:flex;gap:.75rem;margin-top:1rem;flex-wrap:wrap">
      <a href="{{ route('prescriber.questionnaires') }}" class="btn btn-secondary btn-sm">📋 My Questionnaires</a>
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
        <h2 style="font-size:1.1rem">Under my review <span style="background:var(--lavender-soft);color:var(--lavender-deep);font-size:.75rem;padding:.15rem .5rem;border-radius:99px;margin-left:.5rem">{{ $mine->total() }}</span></h2>
      </div>
      <div class="card" style="overflow:hidden">
        <table class="rx-table">
          <thead><tr><th>Patient</th><th>Treatment</th><th>Submitted</th><th>Claimed</th><th></th></tr></thead>
          <tbody>
            @foreach($mine as $rx)
            <tr>
              <td><strong>{{ $rx->customer->full_name ?? '—' }}</strong><br><span class="text-muted text-sm">{{ $rx->customer->email ?? '' }}</span></td>
              <td>{{ $rx->product->name ?? '—' }}</td>
              <td class="text-muted text-sm">{{ $rx->submitted_at?->format('d M Y') ?? '—' }}</td>
              <td class="text-muted text-sm">{{ $rx->reviewed_at?->format('d M H:i') ?? '—' }}</td>
              <td><a href="{{ route('prescriber.show', $rx->id) }}" class="btn btn-primary btn-sm">Review →</a></td>
            </tr>
            @endforeach
          </tbody>
        </table>
      </div>
    </div>
    @endif

    {{-- Pending queue --}}
    <div>
      <div class="section-header" style="margin-bottom:1rem">
        <h2 style="font-size:1.1rem">Awaiting review <span style="background:var(--lavender-soft);color:var(--lavender-deep);font-size:.75rem;padding:.15rem .5rem;border-radius:99px;margin-left:.5rem">{{ $pending->total() }}</span></h2>
      </div>
      @if($pending->isEmpty())
        <div class="card card-pad text-center" style="padding:3rem">
          <p style="font-size:1.25rem;margin-bottom:.5rem">Queue is clear</p>
          <p class="text-muted">No prescriptions awaiting review.</p>
        </div>
      @else
        <div class="card" style="overflow:hidden">
          <table class="rx-table">
            <thead><tr><th>Patient</th><th>Treatment</th><th>Submitted</th><th>Waiting</th><th></th></tr></thead>
            <tbody>
              @foreach($pending as $rx)
              <tr>
                <td><strong>{{ $rx->customer->full_name ?? '—' }}</strong><br><span class="text-muted text-sm">{{ $rx->customer->email ?? '' }}</span></td>
                <td>{{ $rx->product->name ?? '—' }}</td>
                <td class="text-muted text-sm">{{ $rx->submitted_at?->format('d M Y') ?? '—' }}</td>
                <td class="text-muted text-sm">{{ $rx->submitted_at?->diffForHumans() ?? '—' }}</td>
                <td>
                  <form method="POST" action="{{ route('prescriber.claim', $rx->id) }}" style="display:inline">
                    @csrf
                    <button class="btn btn-secondary btn-sm">Claim</button>
                  </form>
                </td>
              </tr>
              @endforeach
            </tbody>
          </table>
        </div>
        <div style="margin-top:1rem">{{ $pending->links('components.pagination') }}</div>
      @endif
    </div>

  </div>
</div>
@endsection
