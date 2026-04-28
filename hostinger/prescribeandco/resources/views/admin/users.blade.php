@extends('layouts.app')
@section('title', 'Manage Users — Admin')

@section('content')
<div style="background:var(--white);border-bottom:1px solid var(--border);padding:2.5rem 0">
  <div class="container">
    <a href="{{ route('admin.index') }}" style="font-size:.875rem;color:var(--charcoal-muted);display:inline-flex;align-items:center;gap:.4rem;margin-bottom:1rem">← Dashboard</a>
    <h1 style="font-size:1.75rem">Users</h1>
  </div>
</div>

<div class="section">
  <div class="container">

    @if(session('success'))
      <div class="alert alert-success" style="margin-bottom:1.5rem">{{ session('success') }}</div>
    @endif
    @if($errors->any())
      <div class="alert alert-error" style="margin-bottom:1.5rem">{{ $errors->first() }}</div>
    @endif

    {{-- Filters --}}
    <form method="GET" action="{{ route('admin.users') }}" style="display:flex;gap:.75rem;flex-wrap:wrap;margin-bottom:1.5rem">
      <input type="text" name="search" value="{{ request('search') }}" placeholder="Search name or email…"
        style="padding:.45rem .75rem;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:.9rem;min-width:220px">
      <select name="role" style="padding:.45rem .75rem;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:.9rem">
        <option value="">All roles</option>
        @foreach(['CUSTOMER','PRESCRIBER','DISPENSER','ADMIN'] as $r)
          <option value="{{ $r }}" @selected(request('role') === $r)>{{ $r }}</option>
        @endforeach
      </select>
      <button type="submit" class="btn btn-secondary btn-sm">Filter</button>
      @if(request('search') || request('role'))
        <a href="{{ route('admin.users') }}" class="btn btn-secondary btn-sm">Clear</a>
      @endif
    </form>

    <div class="card" style="overflow:hidden">
      <table class="rx-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>Status</th>
            <th>Joined</th>
            <th>Change role</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @forelse($users as $user)
          <tr>
            <td>
              <strong>{{ $user->full_name }}</strong><br>
              <span class="text-muted text-sm">{{ $user->email }}</span>
            </td>
            <td><span class="badge badge-lavender">{{ $user->role->value }}</span></td>
            <td>
              @if($user->is_active)
                <span class="badge badge-sage">Active</span>
              @else
                <span class="badge" style="background:#fee2e2;color:#991b1b">Inactive</span>
              @endif
            </td>
            <td class="text-muted text-sm">{{ $user->created_at?->format('d M Y') }}</td>
            <td>
              <form method="POST" action="{{ route('admin.users.role', $user->id) }}" style="display:flex;gap:.4rem">
                @csrf
                <select name="role" style="padding:.3rem .5rem;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:.8rem">
                  @foreach(['CUSTOMER','PRESCRIBER','DISPENSER','ADMIN'] as $r)
                    <option value="{{ $r }}" @selected($user->role->value === $r)>{{ $r }}</option>
                  @endforeach
                </select>
                <button type="submit" class="btn btn-secondary btn-sm" style="font-size:.78rem;padding:.3rem .6rem">Save</button>
              </form>
            </td>
            <td>
              @if($user->id !== session('user_id'))
              <form method="POST" action="{{ route('admin.users.toggle', $user->id) }}"
                    onsubmit="return confirm('{{ $user->is_active ? 'Deactivate' : 'Activate' }} {{ $user->full_name }}?')">
                @csrf
                <button type="submit" class="btn btn-secondary btn-sm" style="font-size:.78rem;padding:.3rem .6rem;{{ !$user->is_active ? '' : 'color:var(--red);border-color:var(--red)' }}">
                  {{ $user->is_active ? 'Deactivate' : 'Activate' }}
                </button>
              </form>
              @endif
            </td>
          </tr>
          @empty
          <tr><td colspan="6" class="text-muted text-sm" style="padding:2rem;text-align:center">No users found.</td></tr>
          @endforelse
        </tbody>
      </table>
    </div>

    <div style="margin-top:1rem">{{ $users->links('components.pagination') }}</div>

  </div>
</div>
@endsection
