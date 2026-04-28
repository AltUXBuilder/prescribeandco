@extends('layouts.app')
@section('title', $condition['headline'])

@section('content')

{{-- Condition hero --}}
<div style="background:var(--white);border-bottom:1px solid var(--border);padding:3.5rem 0">
  <div class="container">
    <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.25rem">
      <span style="font-size:2.5rem">{{ $condition['icon'] }}</span>
      <div>
        <p style="font-size:.75rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--lavender-deep)">Condition Guide</p>
        <h1 style="margin:0">{{ $condition['headline'] }}</h1>
      </div>
    </div>
    <p style="max-width:600px;font-size:1.0625rem;color:var(--charcoal-mid);line-height:1.75">{{ $condition['intro'] }}</p>
    <div style="display:flex;gap:.5rem;margin-top:1.25rem;flex-wrap:wrap">
      @foreach($condition['genders'] as $gender)
        <span class="badge badge-lavender">{{ ucfirst($gender) }}'s Health</span>
      @endforeach
    </div>
  </div>
</div>

{{-- Products --}}
<div class="section">
  <div class="container">
    @if($products->isEmpty())
      <div class="card card-pad text-center" style="padding:3rem">
        <p style="font-size:1.5rem;margin-bottom:.5rem">Coming soon</p>
        <p class="text-muted">Treatments for {{ $condition['headline'] }} will be available shortly.</p>
        <a href="{{ route('register') }}" class="btn btn-primary btn-sm" style="margin-top:1.25rem;display:inline-flex">Get notified</a>
      </div>
    @else
      <div class="section-header">
        <div>
          <h2 class="section-title">Available treatments</h2>
          <p class="section-subtitle">{{ $products->count() }} treatment{{ $products->count() !== 1 ? 's' : '' }} available</p>
        </div>
      </div>
      <div class="product-grid">
        @foreach($products as $product)
          @include('components.product-card', compact('product'))
        @endforeach
      </div>
    @endif
  </div>
</div>

@endsection
