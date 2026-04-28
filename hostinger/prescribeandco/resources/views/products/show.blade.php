@extends('layouts.app')
@section('title', $product->name)
@section('description', Str::limit(strip_tags($product->description ?? ''), 160))

@section('content')

<div style="background:var(--white);border-bottom:1px solid var(--border);padding:2.5rem 0 0">
  <div class="container">
    <a href="{{ route('products.index') }}" style="font-size:.875rem;color:var(--charcoal-muted);display:inline-flex;align-items:center;gap:.4rem;margin-bottom:1.5rem">
      ← Back to treatments
    </a>
    <div style="display:grid;grid-template-columns:1fr 340px;gap:3rem;padding-bottom:3rem" class="product-detail-grid">
      <div>
        <div style="display:flex;align-items:center;gap:.75rem;margin-bottom:1rem;flex-wrap:wrap">
          <span class="badge badge-lavender">{{ $product->medicine_type->value }}</span>
          @if($product->category)
            <span class="badge badge-grey">{{ $product->category->name }}</span>
          @endif
          @if(!$product->is_available)
            <span class="badge badge-red">Out of stock</span>
          @endif
        </div>
        <h1 style="margin-bottom:1rem">{{ $product->name }}</h1>
        @if($product->description)
          <div style="color:var(--charcoal-mid);line-height:1.8;font-size:1rem">
            {!! nl2br(e($product->description)) !!}
          </div>
        @endif
      </div>

      <div>
        <div class="card card-pad" style="position:sticky;top:80px">
          <div style="font-size:1.75rem;font-weight:700;margin-bottom:0.25rem">{{ $product->formatted_price }}</div>
          <p class="text-muted text-sm" style="margin-bottom:1.5rem">per treatment cycle</p>

          @if($product->requires_prescription)
            @if(session('user_id'))
              <a href="{{ route('consultation.start', ['product' => $product->slug]) }}"
                 class="btn btn-primary btn-full" style="margin-bottom:.75rem">
                Start consultation
              </a>
            @else
              <a href="{{ route('register') }}" class="btn btn-primary btn-full" style="margin-bottom:.75rem">
                Create account to start
              </a>
            @endif
            <p class="text-sm text-muted text-center">Prescription required. A prescriber will review your consultation.</p>
          @else
            <a href="#" class="btn btn-primary btn-full">Add to basket</a>
          @endif

          <hr class="divider">
          <div style="display:flex;flex-direction:column;gap:.5rem">
            <div style="display:flex;align-items:center;gap:.6rem;font-size:.875rem;color:var(--charcoal-muted)">
              <span>🔒</span> Encrypted & GDPR compliant
            </div>
            <div style="display:flex;align-items:center;gap:.6rem;font-size:.875rem;color:var(--charcoal-muted)">
              <span>📦</span> Discreet plain-box delivery
            </div>
            <div style="display:flex;align-items:center;gap:.6rem;font-size:.875rem;color:var(--charcoal-muted)">
              <span>👨‍⚕️</span> GMC-registered prescribers
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

@push('head')
<style>
  @media (max-width: 768px) {
    .product-detail-grid { grid-template-columns: 1fr !important; }
  }
</style>
@endpush
@endsection
