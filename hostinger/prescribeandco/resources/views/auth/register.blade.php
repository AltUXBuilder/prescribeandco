@extends('layouts.app')
@section('title', 'Create Account')

@section('content')
<div class="section">
  <div class="container-sm">
    <div class="text-center mb-3">
      <h1 style="font-size:1.75rem">Create your account</h1>
      <p class="text-muted mt-1">Free to join. Start your consultation today.</p>
    </div>

    <div class="card card-pad-lg">
      @if($errors->any())
        <div class="alert alert-error">
          <strong>Please fix the following:</strong>
          <ul style="margin-top:.5rem;padding-left:1.25rem">
            @foreach($errors->all() as $error)
              <li>{{ $error }}</li>
            @endforeach
          </ul>
        </div>
      @endif

      <form method="POST" action="{{ route('register') }}" class="form-stack">
        @csrf

        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="first_name">First name</label>
            <input class="form-input @error('first_name') error @enderror"
                   type="text" id="first_name" name="first_name"
                   value="{{ old('first_name') }}" required autocomplete="given-name">
          </div>
          <div class="form-group">
            <label class="form-label" for="last_name">Last name</label>
            <input class="form-input @error('last_name') error @enderror"
                   type="text" id="last_name" name="last_name"
                   value="{{ old('last_name') }}" required autocomplete="family-name">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="email">Email address</label>
          <input class="form-input @error('email') error @enderror"
                 type="email" id="email" name="email"
                 value="{{ old('email') }}" required autocomplete="email">
        </div>

        <div class="form-group">
          <label class="form-label" for="password">Password</label>
          <input class="form-input @error('password') error @enderror"
                 type="password" id="password" name="password"
                 autocomplete="new-password" required>
          <span class="form-hint">Min 10 characters. Include uppercase, lowercase, a digit and a symbol.</span>
        </div>

        <div class="form-group">
          <label class="form-label" for="password_confirmation">Confirm password</label>
          <input class="form-input" type="password" id="password_confirmation"
                 name="password_confirmation" autocomplete="new-password" required>
        </div>

        <div class="form-group">
          <label class="form-label" for="date_of_birth">Date of birth</label>
          <input class="form-input @error('date_of_birth') error @enderror" type="date" id="date_of_birth" name="date_of_birth"
                 value="{{ old('date_of_birth') }}" required>
        </div>

        <p class="text-sm text-muted">
          By creating an account you agree to our <a href="#" style="color:var(--lavender-deep)">Terms of Service</a> and <a href="#" style="color:var(--lavender-deep)">Privacy Policy</a>.
        </p>

        <button type="submit" class="btn btn-primary btn-full">Create account</button>
      </form>

      <hr class="divider">
      <p class="text-center text-sm text-muted">
        Already have an account?
        <a href="{{ route('login') }}" style="color:var(--lavender-deep);font-weight:600">Sign in</a>
      </p>
    </div>
  </div>
</div>
@endsection
