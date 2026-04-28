@extends('layouts.app')
@section('title', 'Admin Dashboard')

@section('content')
<div style="background:var(--white);border-bottom:1px solid var(--border);padding:2.5rem 0">
  <div class="container">
    <p style="font-size:.72rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--lavender-deep);margin-bottom:.25rem">Admin Portal</p>
    <h1 style="font-size:1.75rem;margin-bottom:.25rem">Dashboard</h1>
    <p class="text-muted">Logged in as {{ session('user_name') }}</p>
  </div>
</div>

<div class="section">
  <div class="container">

    @if(session('success'))
      <div class="alert alert-success" style="margin-bottom:1.5rem">{{ session('success') }}</div>
    @endif

    {{-- Stats --}}
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:2.5rem" class="stats-grid">
      <div class="card card-pad" style="text-align:center">
        <p style="font-size:2rem;font-weight:700;color:var(--lavender-deep)">{{ number_format($stats['total_users']) }}</p>
        <p class="text-muted text-sm">Total Users</p>
      </div>
      <div class="card card-pad" style="text-align:center">
        <p style="font-size:2rem;font-weight:700;color:#d97706">{{ number_format($stats['pending_review']) }}</p>
        <p class="text-muted text-sm">Pending Review</p>
      </div>
      <div class="card card-pad" style="text-align:center">
        <p style="font-size:2rem;font-weight:700;color:#1a7a3c">{{ number_format($stats['fulfilled_total']) }}</p>
        <p class="text-muted text-sm">Fulfilled Total</p>
      </div>
      <div class="card card-pad" style="text-align:center">
        <p style="font-size:2rem;font-weight:700;color:var(--charcoal)">£{{ number_format($stats['revenue_pence'] / 100, 2) }}</p>
        <p class="text-muted text-sm">Revenue (captured)</p>
      </div>
    </div>

    {{-- Role breakdown --}}
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin-bottom:2.5rem" class="role-grid">
      <div class="card card-pad" style="display:flex;align-items:center;gap:1rem">
        <div style="width:44px;height:44px;border-radius:var(--radius-sm);background:var(--lavender-soft);display:flex;align-items:center;justify-content:center;font-size:1.25rem;flex-shrink:0">👥</div>
        <div><p style="font-size:1.5rem;font-weight:700">{{ $stats['customers'] }}</p><p class="text-muted text-sm">Customers</p></div>
      </div>
      <div class="card card-pad" style="display:flex;align-items:center;gap:1rem">
        <div style="width:44px;height:44px;border-radius:var(--radius-sm);background:var(--lavender-soft);display:flex;align-items:center;justify-content:center;font-size:1.25rem;flex-shrink:0">🩺</div>
        <div><p style="font-size:1.5rem;font-weight:700">{{ $stats['prescribers'] }}</p><p class="text-muted text-sm">Prescribers</p></div>
      </div>
      <div class="card card-pad" style="display:flex;align-items:center;gap:1rem">
        <div style="width:44px;height:44px;border-radius:var(--radius-sm);background:var(--lavender-soft);display:flex;align-items:center;justify-content:center;font-size:1.25rem;flex-shrink:0">📦</div>
        <div><p style="font-size:1.5rem;font-weight:700">{{ $stats['dispensers'] }}</p><p class="text-muted text-sm">Dispensers</p></div>
      </div>
    </div>

    {{-- Quick links --}}
    <div style="display:flex;gap:.75rem;margin-bottom:2.5rem;flex-wrap:wrap">
      <a href="{{ route('admin.users') }}" class="btn btn-secondary btn-sm">👥 Manage Users</a>
      <a href="{{ route('admin.prescriptions') }}" class="btn btn-secondary btn-sm">📋 All Prescriptions</a>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem" class="recent-grid">

      {{-- Recent prescriptions --}}
      <div>
        <h2 style="font-size:1.1rem;margin-bottom:1rem">Recent prescriptions</h2>
        <div class="card" style="overflow:hidden">
          <table class="rx-table">
            <thead><tr><th>Patient</th><th>Treatment</th><th>Status</th></tr></thead>
            <tbody>
              @forelse($recentPrescriptions as $rx)
              <tr>
                <td style="font-size:.875rem">{{ $rx->customer->full_name ?? '—' }}</td>
                <td style="font-size:.875rem">{{ $rx->product->name ?? '—' }}</td>
                <td>{!! statusBadge($rx->status->value) !!}</td>
              </tr>
              @empty
              <tr><td colspan="3" class="text-muted text-sm" style="padding:1rem">No prescriptions yet.</td></tr>
              @endforelse
            </tbody>
          </table>
        </div>
        <div style="margin-top:.75rem"><a href="{{ route('admin.prescriptions') }}" class="text-sm" style="color:var(--lavender-deep)">View all →</a></div>
      </div>

      {{-- Recent users --}}
      <div>
        <h2 style="font-size:1.1rem;margin-bottom:1rem">Recent sign-ups</h2>
        <div class="card" style="overflow:hidden">
          <table class="rx-table">
            <thead><tr><th>Name</th><th>Role</th><th>Joined</th></tr></thead>
            <tbody>
              @forelse($recentUsers as $user)
              <tr>
                <td style="font-size:.875rem">
                  {{ $user->full_name }}<br>
                  <span class="text-muted" style="font-size:.78rem">{{ $user->email }}</span>
                </td>
                <td><span class="badge badge-lavender" style="font-size:.72rem">{{ $user->role->value }}</span></td>
                <td class="text-muted text-sm">{{ $user->created_at?->format('d M') }}</td>
              </tr>
              @empty
              <tr><td colspan="3" class="text-muted text-sm" style="padding:1rem">No users yet.</td></tr>
              @endforelse
            </tbody>
          </table>
        </div>
        <div style="margin-top:.75rem"><a href="{{ route('admin.users') }}" class="text-sm" style="color:var(--lavender-deep)">View all →</a></div>
      </div>

    </div>
  </div>
</div>

@push('head')
<style>
  @media (max-width: 900px) {
    .stats-grid, .role-grid, .recent-grid { grid-template-columns: 1fr 1fr !important; }
  }
  @media (max-width: 600px) {
    .stats-grid, .role-grid, .recent-grid { grid-template-columns: 1fr !important; }
  }
</style>
@endpush
@endsection
