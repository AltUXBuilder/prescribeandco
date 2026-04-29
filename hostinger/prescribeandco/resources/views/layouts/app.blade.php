<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="csrf-token" content="{{ csrf_token() }}">
  <title>@yield('title', 'Prescribe & Co') — UK Online Prescriptions</title>
  <meta name="description" content="@yield('description', 'Safe, private UK prescription service. Consult online, get approved by a registered prescriber.')">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="{{ asset('css/app.css') }}">
  @stack('head')
</head>
<body>

{{-- Navigation --}}
<nav class="nav">
  <div class="container">
    <div class="nav-inner">

      {{-- Logo --}}
      <a href="{{ route('home') }}" class="nav-logo">P&amp;Co.</a>

      {{-- Desktop links --}}
      <div class="nav-links">
        {{-- Men's Health dropdown --}}
        <div class="nav-dropdown">
          <button class="nav-dropdown-toggle">
            Men's Health
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"/></svg>
          </button>
          <div class="nav-dropdown-menu">
            <a href="{{ route('condition.show', 'weight-loss') }}#mens" class="dropdown-item">
              <span class="dropdown-item-icon">⚖️</span>
              <div><div class="dropdown-item-text">Weight Loss</div><div class="dropdown-item-desc">Semaglutide, Wegovy, Mounjaro</div></div>
            </a>
            <a href="{{ route('condition.show', 'hair-loss') }}#mens" class="dropdown-item">
              <span class="dropdown-item-icon">🧴</span>
              <div><div class="dropdown-item-text">Hair Loss</div><div class="dropdown-item-desc">Finasteride, Dutasteride, Minoxidil</div></div>
            </a>
            <a href="{{ route('condition.show', 'erectile-dysfunction') }}" class="dropdown-item">
              <span class="dropdown-item-icon">💊</span>
              <div><div class="dropdown-item-text">Erectile Dysfunction</div><div class="dropdown-item-desc">Sildenafil, Tadalafil & more</div></div>
            </a>
          </div>
        </div>

        {{-- Women's Health dropdown --}}
        <div class="nav-dropdown">
          <button class="nav-dropdown-toggle">
            Women's Health
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"/></svg>
          </button>
          <div class="nav-dropdown-menu">
            <a href="{{ route('condition.show', 'weight-loss') }}#womens" class="dropdown-item">
              <span class="dropdown-item-icon">⚖️</span>
              <div><div class="dropdown-item-text">Weight Loss</div><div class="dropdown-item-desc">Semaglutide, Wegovy, Mounjaro</div></div>
            </a>
            <a href="{{ route('condition.show', 'hair-loss') }}#womens" class="dropdown-item">
              <span class="dropdown-item-icon">🧴</span>
              <div><div class="dropdown-item-text">Hair Loss</div><div class="dropdown-item-desc">Minoxidil & personalised plans</div></div>
            </a>
            <a href="{{ route('condition.show', 'skin-health') }}" class="dropdown-item">
              <span class="dropdown-item-icon">✨</span>
              <div><div class="dropdown-item-text">Skin Health</div><div class="dropdown-item-desc">Tretinoin, Azelaic Acid & more</div></div>
            </a>
            <a href="{{ route('condition.show', 'digestive-health') }}" class="dropdown-item">
              <span class="dropdown-item-icon">🌿</span>
              <div><div class="dropdown-item-text">Digestive Health</div><div class="dropdown-item-desc">IBS, acid reflux & bloating</div></div>
            </a>
          </div>
        </div>

        <a href="{{ route('products.index') }}" class="nav-link">All Treatments</a>
      </div>

      {{-- Auth actions --}}
      <div class="nav-actions">
        @if(session('user_id'))
          @php $myDashboard = match(session('user_role')) { 'ADMIN' => route('admin.index'), 'PRESCRIBER' => route('prescriber.queue'), 'DISPENSER' => route('dispenser.queue'), default => route('dashboard') }; @endphp
          <a href="{{ $myDashboard }}" class="btn btn-secondary btn-sm">My Account</a>
          <form action="{{ route('logout') }}" method="POST" style="display:inline">
            @csrf
            <button type="submit" class="btn btn-primary btn-sm">Sign Out</button>
          </form>
        @else
          <a href="{{ route('login') }}" class="btn btn-secondary btn-sm">Sign In</a>
          <a href="{{ route('register') }}" class="btn btn-primary btn-sm">Get Started</a>
        @endif
      </div>

      {{-- Hamburger --}}
      <button class="nav-hamburger" onclick="toggleMobileNav()" aria-label="Menu">
        <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"/>
        </svg>
      </button>
    </div>
  </div>

  {{-- Mobile nav --}}
  <div class="mobile-nav" id="mobileNav">
    <p style="font-size:.7rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#bbb;padding:.5rem 1rem 0">Men's Health</p>
    <a href="{{ route('condition.show', 'weight-loss') }}#mens">⚖️ Weight Loss</a>
    <a href="{{ route('condition.show', 'hair-loss') }}#mens">🧴 Hair Loss</a>
    <a href="{{ route('condition.show', 'erectile-dysfunction') }}">💊 Erectile Dysfunction</a>
    <p style="font-size:.7rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#bbb;padding:.5rem 1rem 0">Women's Health</p>
    <a href="{{ route('condition.show', 'weight-loss') }}#womens">⚖️ Weight Loss</a>
    <a href="{{ route('condition.show', 'hair-loss') }}#womens">🧴 Hair Loss</a>
    <a href="{{ route('condition.show', 'skin-health') }}">✨ Skin Health</a>
    <a href="{{ route('condition.show', 'digestive-health') }}">🌿 Digestive Health</a>
    <a href="{{ route('products.index') }}">All Treatments</a>
    @if(session('user_id'))
      @php $myDashboard = match(session('user_role')) { 'ADMIN' => route('admin.index'), 'PRESCRIBER' => route('prescriber.queue'), 'DISPENSER' => route('dispenser.queue'), default => route('dashboard') }; @endphp
      <a href="{{ $myDashboard }}">My Account</a>
    @else
      <a href="{{ route('login') }}">Sign In</a>
      <a href="{{ route('register') }}">Create Account</a>
    @endif
  </div>
</nav>

{{-- Flash messages --}}
@if(session('success'))
  <div class="container" style="padding-top:1rem">
    <div class="alert alert-success">{{ session('success') }}</div>
  </div>
@endif
@if(session('error'))
  <div class="container" style="padding-top:1rem">
    <div class="alert alert-error">{{ session('error') }}</div>
  </div>
@endif

{{-- Page content --}}
@yield('content')

{{-- Footer --}}
<footer class="footer">
  <div class="container">
    <div class="footer-grid">
      <div>
        <div class="footer-logo">P&amp;Co.</div>
        <p class="footer-desc">Safe, discreet UK prescription service. All prescriptions issued by GMC-registered doctors.</p>
      </div>
      <div class="footer-col">
        <h4>Conditions</h4>
        <a href="{{ route('condition.show', 'weight-loss') }}">Weight Loss</a>
        <a href="{{ route('condition.show', 'hair-loss') }}">Hair Loss</a>
        <a href="{{ route('condition.show', 'erectile-dysfunction') }}">Erectile Dysfunction</a>
        <a href="{{ route('condition.show', 'skin-health') }}">Skin Health</a>
        <a href="{{ route('condition.show', 'digestive-health') }}">Digestive Health</a>
      </div>
      <div class="footer-col">
        <h4>Account</h4>
        <a href="{{ route('register') }}">Get Started</a>
        <a href="{{ route('login') }}">Sign In</a>
        @if(session('user_id'))
          <a href="{{ route('dashboard') }}">My Dashboard</a>
        @endif
      </div>
      <div class="footer-col">
        <h4>Company</h4>
        <a href="#">About Us</a>
        <a href="#">How It Works</a>
        <a href="#">Prescribers</a>
        <a href="#">Contact</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© {{ date('Y') }} Prescribe & Co. All rights reserved. Registered in England & Wales.</span>
      <div class="footer-legal">
        <a href="#">Privacy</a>
        <a href="#">Terms</a>
        <a href="#">Cookie Policy</a>
      </div>
    </div>
  </div>
</footer>

<script>
function toggleMobileNav() {
  document.getElementById('mobileNav').classList.toggle('open');
}
</script>
@stack('scripts')
</body>
</html>
