@extends('layouts.app')
@section('title', 'All Prescriptions — Admin')

@section('content')
<div style="background:var(--white);border-bottom:1px solid var(--border);padding:2.5rem 0">
  <div class="container">
    <a href="{{ route('admin.index') }}" style="font-size:.875rem;color:var(--charcoal-muted);display:inline-flex;align-items:center;gap:.4rem;margin-bottom:1rem">← Dashboard</a>
    <h1 style="font-size:1.75rem">All Prescriptions</h1>
  </div>
</div>

<div class="section">
  <div class="container">

    {{-- Filters --}}
    <form method="GET" action="{{ route('admin.prescriptions') }}" style="display:flex;gap:.75rem;flex-wrap:wrap;margin-bottom:1.5rem">
      <input type="text" name="search" value="{{ request('search') }}" placeholder="Search patient name or email…"
        style="padding:.45rem .75rem;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:.9rem;min-width:220px">
      <select name="status" style="padding:.45rem .75rem;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:.9rem">
        <option value="">All statuses</option>
        @foreach(['DRAFT','SUBMITTED','UNDER_REVIEW','APPROVED','DISPENSING','FULFILLED','REJECTED','CANCELLED','EXPIRED'] as $s)
          <option value="{{ $s }}" @selected(request('status') === $s)>{{ ucwords(strtolower(str_replace('_',' ',$s))) }}</option>
        @endforeach
      </select>
      <button type="submit" class="btn btn-secondary btn-sm">Filter</button>
      @if(request('search') || request('status'))
        <a href="{{ route('admin.prescriptions') }}" class="btn btn-secondary btn-sm">Clear</a>
      @endif
    </form>

    <div class="card" style="overflow:hidden">
      <table class="rx-table">
        <thead>
          <tr>
            <th>Patient</th>
            <th>Treatment</th>
            <th>Status</th>
            <th>Submitted</th>
            <th>Prescriber</th>
            <th>Dispenser</th>
          </tr>
        </thead>
        <tbody>
          @forelse($prescriptions as $rx)
          <tr>
            <td>
              <strong>{{ $rx->customer->full_name ?? '—' }}</strong><br>
              <span class="text-muted text-sm">{{ $rx->customer->email ?? '' }}</span>
            </td>
            <td style="font-size:.9rem">{{ $rx->product->name ?? '—' }}</td>
            <td>{!! statusBadge($rx->status->value) !!}</td>
            <td class="text-muted text-sm">{{ $rx->submitted_at?->format('d M Y') ?? '—' }}</td>
            <td class="text-muted text-sm">
              @if($rx->prescriber_id)
                @php $p = \App\Models\User::find($rx->prescriber_id); @endphp
                {{ $p?->full_name ?? 'Unknown' }}
              @else —
              @endif
            </td>
            <td class="text-muted text-sm">
              @if($rx->dispenser_id)
                @php $d = \App\Models\User::find($rx->dispenser_id); @endphp
                {{ $d?->full_name ?? 'Unknown' }}
              @else —
              @endif
            </td>
          </tr>
          @empty
          <tr><td colspan="6" class="text-muted text-sm" style="padding:2rem;text-align:center">No prescriptions found.</td></tr>
          @endforelse
        </tbody>
      </table>
    </div>

    <div style="margin-top:1rem">{{ $prescriptions->links('components.pagination') }}</div>

  </div>
</div>
@endsection
