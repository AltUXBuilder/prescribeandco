@extends('layouts.app')
@section('title', 'All Orders')

@php
  $role = session('user_role');
  $backRoute = match($role) { 'ADMIN' => 'admin.index', 'PRESCRIBER' => 'prescriber.queue', default => 'dispenser.queue' };
@endphp

@section('content')
<div style="background:var(--white);border-bottom:1px solid var(--border);padding:2.5rem 0">
  <div class="container">
    <a href="{{ route($backRoute) }}" style="font-size:.875rem;color:var(--charcoal-muted);display:inline-flex;align-items:center;gap:.4rem;margin-bottom:1rem">← Dashboard</a>
    <div style="display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;gap:.75rem">
      <div>
        <h1 style="font-size:1.75rem;margin-bottom:.2rem">All Orders</h1>
        <p class="text-muted text-sm">Every access to this view is logged in the audit trail.</p>
      </div>
      <span class="badge badge-lavender">{{ number_format($orders->total()) }} orders</span>
    </div>
  </div>
</div>

<div class="section">
  <div class="container">

    {{-- Filters --}}
    <form method="GET" style="display:flex;gap:.75rem;flex-wrap:wrap;margin-bottom:1.5rem">
      <input type="text" name="search" value="{{ request('search') }}"
        placeholder="Search patient, product, or order ID…"
        style="padding:.45rem .75rem;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:.9rem;min-width:260px">
      <select name="status" style="padding:.45rem .75rem;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:.9rem">
        <option value="">All statuses</option>
        @foreach(['DRAFT','SUBMITTED','UNDER_REVIEW','APPROVED','DISPENSING','FULFILLED','REJECTED','CANCELLED','EXPIRED'] as $s)
          <option value="{{ $s }}" @selected(request('status') === $s)>{{ ucwords(strtolower(str_replace('_',' ',$s))) }}</option>
        @endforeach
      </select>
      <button type="submit" class="btn btn-secondary btn-sm">Search</button>
      @if(request()->hasAny(['search','status']))
        <a href="{{ route('orders.index') }}" class="btn btn-secondary btn-sm">Clear</a>
      @endif
    </form>

    <div class="card" style="overflow:hidden">
      <table class="rx-table">
        <thead>
          <tr>
            <th>Order #</th>
            <th>Patient</th>
            <th>Product</th>
            <th>Status</th>
            <th>Prescriber</th>
            <th>Submitted</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @forelse($orders as $order)
          <tr>
            <td>
              <code style="font-size:.78rem;color:var(--charcoal-muted);letter-spacing:.04em">
                {{ strtoupper(substr($order->id, 0, 8)) }}
              </code>
            </td>
            <td>
              <strong style="font-size:.9rem">{{ $order->customer->full_name ?? '—' }}</strong><br>
              <span class="text-muted" style="font-size:.78rem">{{ $order->customer->email ?? '' }}</span>
            </td>
            <td style="font-size:.9rem">{{ $order->product->name ?? '—' }}</td>
            <td>{!! statusBadge($order->status->value) !!}</td>
            <td class="text-muted text-sm">
              @if($order->prescriber_id)
                @php $p = \App\Models\User::find($order->prescriber_id); @endphp
                {{ $p?->full_name ?? '—' }}
              @else —
              @endif
            </td>
            <td class="text-muted text-sm">{{ $order->submitted_at?->format('d M Y') ?? '—' }}</td>
            <td>
              <a href="{{ route('orders.show', $order->id) }}" class="btn btn-secondary btn-sm">View</a>
            </td>
          </tr>
          @empty
          <tr>
            <td colspan="7" class="text-muted text-sm" style="padding:2rem;text-align:center">No orders found.</td>
          </tr>
          @endforelse
        </tbody>
      </table>
    </div>

    <div style="margin-top:1rem">{{ $orders->links('components.pagination') }}</div>

  </div>
</div>
@endsection
