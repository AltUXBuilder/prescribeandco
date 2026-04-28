@extends('layouts.app')

@section('title', 'Prescribe & Co — Online UK Prescriptions')
@section('description', 'Consult with a UK-registered prescriber online. Weight loss, hair loss, skin health, ED and more.')

@section('content')

{{-- Hero --}}
<section class="hero">
  <div class="container">
    <p class="hero-eyebrow">UK-Registered Prescribers</p>
    <h1 class="hero-title">Healthcare that fits around&nbsp;your&nbsp;life</h1>
    <p class="hero-subtitle">Answer a short consultation. A prescriber reviews and approves. Treatment delivered discreetly to your door.</p>
    <div class="hero-actions">
      <a href="{{ route('products.index') }}" class="btn btn-primary btn-lg">Browse Treatments</a>
      <a href="{{ route('register') }}" class="btn btn-secondary btn-lg">Create Free Account</a>
    </div>
    <div class="hero-trust">
      <div class="trust-item">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z"/></svg>
        GMC-registered prescribers
      </div>
      <div class="trust-item">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"/></svg>
        Fully encrypted & private
      </div>
      <div class="trust-item">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"/></svg>
        Discreet tracked delivery
      </div>
    </div>
  </div>
</section>

{{-- Conditions --}}
<section class="section section-border">
  <div class="container">
    <div class="section-header">
      <div>
        <h2 class="section-title">Browse by condition</h2>
        <p class="section-subtitle">Clinically-backed treatments for common conditions</p>
      </div>
    </div>
    <div class="condition-grid">
      @foreach($conditions as $condition)
        <a href="{{ route('condition.show', $condition['slug']) }}" class="condition-card">
          <div class="condition-card-icon">{{ $condition['icon'] }}</div>
          <div class="condition-card-name">{{ $condition['name'] }}</div>
        </a>
      @endforeach
    </div>
  </div>
</section>

{{-- Featured products --}}
@if($featuredProducts->isNotEmpty())
<section class="section section-white section-border">
  <div class="container">
    <div class="section-header">
      <div>
        <h2 class="section-title">Popular treatments</h2>
        <p class="section-subtitle">Most requested by our patients</p>
      </div>
      <a href="{{ route('products.index') }}" class="btn btn-secondary btn-sm">View all</a>
    </div>
    <div class="product-grid">
      @foreach($featuredProducts as $product)
        @include('components.product-card', compact('product'))
      @endforeach
    </div>
  </div>
</section>
@endif

{{-- How it works --}}
<section class="section">
  <div class="container">
    <div class="text-center mb-3">
      <h2>How it works</h2>
      <p class="text-muted mt-1">Three steps from consultation to door</p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1.5rem;margin-top:2.5rem">
      @foreach([
        ['step'=>'01','title'=>'Complete a consultation','desc'=>'Answer a short, clinically-designed questionnaire about your health and treatment goals.'],
        ['step'=>'02','title'=>'Prescriber review','desc'=>'A UK-registered prescriber reviews your consultation, usually within 24 hours.'],
        ['step'=>'03','title'=>'Treatment delivered','desc'=>'If approved, your treatment is dispensed and shipped in discreet, plain packaging.'],
      ] as $step)
        <div class="card card-pad">
          <div style="font-size:.75rem;font-weight:700;letter-spacing:.1em;color:var(--lavender-deep);margin-bottom:.75rem">STEP {{ $step['step'] }}</div>
          <h3 style="margin-bottom:.5rem">{{ $step['title'] }}</h3>
          <p class="text-sm text-muted">{{ $step['desc'] }}</p>
        </div>
      @endforeach
    </div>
  </div>
</section>

@endsection
