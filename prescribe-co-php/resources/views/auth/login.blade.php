@extends('layouts.app')
@section('title', 'Sign In')

@section('content')
<div class="section">
  <div class="container-sm">
    <div class="text-center mb-3">
      <h1 style="font-size:1.75rem">Welcome back</h1>
      <p class="text-muted mt-1">Sign in to your Prescribe & Co account</p>
    </div>

    <div class="card card-pad-lg">
      @if($errors->any())
        <div class="alert alert-error">{{ $errors->first() }}</div>
      @endif

      <form method="POST" action="{{ route('login') }}" class="form-stack">
        @csrf

        <div class="form-group">
          <label class="form-label" for="email">Email address</label>
          <input class="form-input @error('email') error @enderror"
                 type="email" id="email" name="email"
                 value="{{ old('email') }}"
                 autocomplete="email" required autofocus>
        </div>

        <div class="form-group">
          <label class="form-label" for="password">Password</label>
          <input class="form-input @error('password') error @enderror"
                 type="password" id="password" name="password"
                 autocomplete="current-password" required>
        </div>

        <button type="submit" class="btn btn-primary btn-full">Sign in</button>
      </form>

      <hr class="divider">

      <p class="text-center text-sm text-muted">
        Don't have an account?
        <a href="{{ route('register') }}" style="color:var(--lavender-deep);font-weight:600">Create one free</a>
      </p>
    </div>
  </div>
</div>
@endsection
