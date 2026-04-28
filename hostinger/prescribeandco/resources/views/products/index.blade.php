@extends('layouts.app')
@section('title', 'All Treatments')

@section('content')

<div style="background:var(--white);border-bottom:1px solid var(--border);padding:2.5rem 0">
  <div class="container">
    <p style="font-size:.75rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--lavender-deep);margin-bottom:.5rem">Treatments</p>
    <h1 style="font-size:2rem;margin-bottom:.5rem">All Treatments</h1>
    <p class="text-muted">Clinician-approved medicines, prescribed online</p>
  </div>
</div>

<div class="section-sm">
  <div class="container">

    {{-- Filters --}}
    <form method="GET" action="{{ route('products.index') }}" class="filter-bar">
      <input type="search" name="search" placeholder="Search treatments…" value="{{ request('search') }}">
      <select name="medicine_type" onchange="this.form.submit()">
        <option value="">All types</option>
        <option value="POM" @selected(request('medicine_type') === 'POM')>Prescription only (POM)</option>
        <option value="P" @selected(request('medicine_type') === 'P')>Pharmacy (P)</option>
        <option value="GSL" @selected(request('medicine_type') === 'GSL')>General sale (GSL)</option>
      </select>
      <select name="category_id" onchange="this.form.submit()">
        <option value="">All conditions</option>
        @foreach($categories as $cat)
          <option value="{{ $cat->id }}" @selected(request('category_id') === $cat->id)>{{ $cat->name }}</option>
        @endforeach
      </select>
      <button type="submit" class="btn btn-primary btn-sm">Search</button>
      @if(request()->hasAny(['search','medicine_type','category_id']))
        <a href="{{ route('products.index') }}" class="btn btn-secondary btn-sm">Clear</a>
      @endif
    </form>

    @if($products->isEmpty())
      <div class="card card-pad text-center" style="padding:3rem">
        <p class="text-muted">No treatments found. <a href="{{ route('products.index') }}" style="color:var(--lavender-deep)">Clear filters</a></p>
      </div>
    @else
      <div class="product-grid">
        @foreach($products as $product)
          @include('components.product-card', compact('product'))
        @endforeach
      </div>

      {{-- Pagination --}}
      <div style="margin-top:2rem">
        {{ $products->withQueryString()->links('components.pagination') }}
      </div>
    @endif

  </div>
</div>
@endsection
