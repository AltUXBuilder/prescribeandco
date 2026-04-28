@extends('layouts.app')
@section('title', $condition['headline'] . ' Treatment — Prescribe & Co')
@section('description', $condition['intro'])

@section('content')

@php $isShared = count($condition['genders']) > 1; @endphp

{{-- Hero ─────────────────────────────────────────────────────────────────── --}}
<div style="background:var(--white);border-bottom:1px solid var(--border);padding:3rem 0">
  <div class="container">
    <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.25rem">
      <span style="font-size:2.5rem">{{ $condition['icon'] }}</span>
      <div>
        <p style="font-size:.72rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--lavender-deep);margin-bottom:.2rem">Condition Guide</p>
        <h1 style="margin:0;font-size:2rem">{{ $condition['headline'] }}</h1>
      </div>
    </div>
    <p style="max-width:640px;font-size:1.0625rem;color:var(--charcoal-mid);line-height:1.75;margin-bottom:1.25rem">
      {{ $condition['intro'] }}
    </p>

    @if($isShared)
      {{-- Gender jump links --}}
      <div style="display:flex;gap:.75rem;flex-wrap:wrap">
        <a href="#mens" class="btn btn-secondary btn-sm">👨 Men's section</a>
        <a href="#womens" class="btn btn-secondary btn-sm">👩 Women's section</a>
      </div>
    @else
      <div style="display:flex;gap:.5rem">
        @foreach($condition['genders'] as $g)
          <span class="badge badge-lavender">{{ ucfirst($g) }}'s Health</span>
        @endforeach
      </div>
    @endif
  </div>
</div>

{{-- Gender sections (shared conditions only) ────────────────────────────── --}}
@if($isShared)
<div style="border-bottom:1px solid var(--border)">
  <div class="container" style="padding-top:0;padding-bottom:0">

    {{-- Men's section --}}
    <div id="mens" style="padding:3rem 0;border-bottom:1px solid var(--border)">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:3rem;align-items:center" class="gender-section-grid">
        <div>
          <span class="badge badge-lavender" style="margin-bottom:.75rem">👨 Men's Health</span>
          <h2 style="font-size:1.5rem;margin-bottom:1rem">{{ $condition['mens']['title'] }}</h2>
          <p style="color:var(--charcoal-mid);line-height:1.8;font-size:1rem">{{ $condition['mens']['intro'] }}</p>
          <a href="{{ route('register') }}" class="btn btn-primary btn-sm" style="margin-top:1.5rem;display:inline-flex">
            Start men's consultation →
          </a>
        </div>
        <div style="background:var(--lavender-soft);border-radius:var(--radius);padding:2rem">
          <p style="font-size:.8rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--lavender-deep);margin-bottom:1rem">How it works</p>
          @foreach(['Complete a short online consultation','A UK prescriber reviews your case, usually within 24 hours','Treatment dispensed and delivered in discreet packaging'] as $i => $step)
            <div style="display:flex;gap:.75rem;margin-bottom:{{ $i < 2 ? '.875rem' : '0' }}">
              <div style="width:24px;height:24px;border-radius:50%;background:var(--lavender-deep);color:#fff;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;flex-shrink:0">{{ $i+1 }}</div>
              <p style="font-size:.9rem;color:var(--charcoal-mid);line-height:1.5;margin:0">{{ $step }}</p>
            </div>
          @endforeach
        </div>
      </div>
    </div>

    {{-- Women's section --}}
    <div id="womens" style="padding:3rem 0">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:3rem;align-items:center" class="gender-section-grid">
        <div>
          <span class="badge badge-lavender" style="margin-bottom:.75rem">👩 Women's Health</span>
          <h2 style="font-size:1.5rem;margin-bottom:1rem">{{ $condition['womens']['title'] }}</h2>
          <p style="color:var(--charcoal-mid);line-height:1.8;font-size:1rem">{{ $condition['womens']['intro'] }}</p>
          <a href="{{ route('register') }}" class="btn btn-primary btn-sm" style="margin-top:1.5rem;display:inline-flex">
            Start women's consultation →
          </a>
        </div>
        <div style="background:var(--lavender-soft);border-radius:var(--radius);padding:2rem">
          <p style="font-size:.8rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--lavender-deep);margin-bottom:1rem">How it works</p>
          @foreach(['Complete a short online consultation','A UK prescriber reviews your case, usually within 24 hours','Treatment dispensed and delivered in discreet packaging'] as $i => $step)
            <div style="display:flex;gap:.75rem;margin-bottom:{{ $i < 2 ? '.875rem' : '0' }}">
              <div style="width:24px;height:24px;border-radius:50%;background:var(--lavender-deep);color:#fff;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;flex-shrink:0">{{ $i+1 }}</div>
              <p style="font-size:.9rem;color:var(--charcoal-mid);line-height:1.5;margin:0">{{ $step }}</p>
            </div>
          @endforeach
        </div>
      </div>
    </div>

  </div>
</div>
@endif

{{-- Available treatments ─────────────────────────────────────────────────── --}}
<div class="section">
  <div class="container">
    @if($products->isEmpty())
      <div class="card card-pad text-center" style="padding:3rem">
        <p style="font-size:1.5rem;margin-bottom:.5rem">Coming soon</p>
        <p class="text-muted">Treatments for {{ $condition['headline'] }} will be available shortly.</p>
        <a href="{{ route('register') }}" class="btn btn-primary btn-sm" style="margin-top:1.25rem;display:inline-flex">Get notified →</a>
      </div>
    @else
      <div class="section-header">
        <div>
          <h2 class="section-title">Available treatments</h2>
          <p class="section-subtitle">{{ $products->count() }} treatment{{ $products->count() !== 1 ? 's' : '' }} available</p>
        </div>
        <a href="{{ route('products.index') }}" class="btn btn-secondary btn-sm">View all treatments</a>
      </div>
      <div class="product-grid">
        @foreach($products as $product)
          @include('components.product-card', compact('product'))
        @endforeach
      </div>
    @endif
  </div>
</div>

@push('head')
<style>
  @media (max-width: 768px) {
    .gender-section-grid { grid-template-columns: 1fr !important; }
  }
</style>
@endpush

@push('scripts')
<script>
  // Auto-scroll to #mens or #womens on load if present in URL
  if (window.location.hash === '#mens' || window.location.hash === '#womens') {
    setTimeout(() => {
      const el = document.querySelector(window.location.hash);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }
</script>
@endpush

@endsection
