@extends('layouts.app')
@section('title', 'My Dashboard')

@section('content')
<div style="background:var(--white);border-bottom:1px solid var(--border);padding:2.5rem 0">
  <div class="container">
    <h1 style="font-size:1.75rem;margin-bottom:.25rem">My Account</h1>
    <p class="text-muted">Welcome back, {{ session('user_name') }}</p>
  </div>
</div>

<div class="section">
  <div class="container">
    <div style="display:grid;grid-template-columns:220px 1fr;gap:2rem" class="dashboard-grid">

      {{-- Sidebar --}}
      <div>
        <div class="card card-pad">
          <nav style="display:flex;flex-direction:column;gap:.25rem">
            <a href="{{ route('dashboard') }}" style="display:flex;align-items:center;gap:.6rem;padding:.6rem .75rem;border-radius:var(--radius-sm);font-size:.9rem;font-weight:600;background:var(--lavender-soft);color:var(--lavender-deep)">
              📋 My Prescriptions
            </a>
            <a href="{{ route('products.index') }}" style="display:flex;align-items:center;gap:.6rem;padding:.6rem .75rem;border-radius:var(--radius-sm);font-size:.9rem;color:var(--charcoal-mid)">
              💊 Browse Treatments
            </a>
          </nav>
        </div>
      </div>

      {{-- Main --}}
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem;flex-wrap:wrap;gap:1rem">
          <h2 style="font-size:1.25rem">My Prescriptions</h2>
          <a href="{{ route('products.index') }}" class="btn btn-primary btn-sm">+ New Consultation</a>
        </div>

        @if($prescriptions->isEmpty())
          <div class="card card-pad text-center" style="padding:3rem">
            <p style="font-size:1.25rem;margin-bottom:.5rem">No prescriptions yet</p>
            <p class="text-muted">Start a consultation to get your first treatment.</p>
            <a href="{{ route('products.index') }}" class="btn btn-lavender btn-sm" style="margin-top:1.5rem;display:inline-flex">Browse treatments</a>
          </div>
        @else
          <div class="card" style="overflow:hidden">
            <table class="rx-table">
              <thead>
                <tr>
                  <th>Treatment</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @foreach($prescriptions as $rx)
                  <tr>
                    <td>
                      <strong>{{ $rx->product->name ?? 'Unknown product' }}</strong>
                    </td>
                    <td>{!! statusBadge($rx->status->value) !!}</td>
                    <td class="text-muted text-sm">
                      {{ $rx->submitted_at ? $rx->submitted_at->format('d M Y') : '—' }}
                    </td>
                    <td>
                      <a href="{{ route('dashboard.prescription', $rx->id) }}" class="btn btn-secondary btn-sm">View</a>
                    </td>
                  </tr>
                @endforeach
              </tbody>
            </table>
          </div>

          <div style="margin-top:1rem">
            {{ $prescriptions->links('components.pagination') }}
          </div>
        @endif
      </div>

    </div>
  </div>
</div>

@push('head')
<style>
  @media (max-width: 768px) {
    .dashboard-grid { grid-template-columns: 1fr !important; }
  }
</style>
@endpush
@endsection
