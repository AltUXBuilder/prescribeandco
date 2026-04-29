@extends('layouts.app')
@section('title', 'Questionnaires')

@php
  $isAdmin = session('user_role') === 'ADMIN';
  $createRoute = $isAdmin ? 'admin.questionnaires.create' : 'prescriber.questionnaires.create';
  $editRoute   = $isAdmin ? 'admin.questionnaires.edit'   : 'prescriber.questionnaires.edit';
  $backRoute   = $isAdmin ? 'admin.index'                 : 'prescriber.queue';
  $backLabel   = $isAdmin ? 'Dashboard'                   : 'Queue';
@endphp

@section('content')
<div style="background:var(--white);border-bottom:1px solid var(--border);padding:2.5rem 0">
  <div class="container">
    <a href="{{ route($backRoute) }}" style="font-size:.875rem;color:var(--charcoal-muted);display:inline-flex;align-items:center;gap:.4rem;margin-bottom:1rem">← {{ $backLabel }}</a>
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem">
      <h1 style="font-size:1.75rem">Questionnaires</h1>
      <a href="{{ route($createRoute) }}" class="btn btn-primary btn-sm">+ New questionnaire</a>
    </div>
  </div>
</div>

<div class="section">
  <div class="container">

    @if(session('success'))
      <div class="alert alert-success" style="margin-bottom:1.5rem">{{ session('success') }}</div>
    @endif

    <div class="card" style="overflow:hidden">
      <table class="rx-table">
        <thead>
          <tr><th>Title</th><th>Questions</th><th>Version</th><th>Status</th><th>Created by</th><th>Date</th><th></th></tr>
        </thead>
        <tbody>
          @forelse($questionnaires as $q)
          <tr>
            <td>
              <strong>{{ $q->title }}</strong>
              @if($q->description)<br><span class="text-muted text-sm">{{ Str::limit($q->description, 80) }}</span>@endif
            </td>
            <td class="text-sm">{{ count($q->schema['questions'] ?? []) }}</td>
            <td class="text-sm">v{{ $q->version }}</td>
            <td>
              @if($q->is_active)
                <span class="badge" style="background:#F0F6F1;color:#2D6A4F">Active</span>
              @else
                <span class="badge" style="background:#F0EFED;color:var(--charcoal-muted)">Inactive</span>
              @endif
            </td>
            <td class="text-muted text-sm">{{ $q->creator->full_name ?? '—' }}</td>
            <td class="text-muted text-sm">{{ $q->created_at?->format('d M Y') }}</td>
            <td style="white-space:nowrap">
              <a href="{{ route($editRoute, $q->id) }}" class="btn btn-secondary btn-sm" style="margin-right:.4rem">Edit</a>
              @if($isAdmin)
              <form method="POST" action="{{ route('admin.questionnaires.toggle', $q->id) }}" style="display:inline">
                @csrf
                <button type="submit" class="btn btn-secondary btn-sm" style="font-size:.78rem">
                  {{ $q->is_active ? 'Deactivate' : 'Activate' }}
                </button>
              </form>
              @endif
            </td>
          </tr>
          @empty
          <tr><td colspan="7" class="text-muted text-sm" style="padding:2rem;text-align:center">No questionnaires yet.</td></tr>
          @endforelse
        </tbody>
      </table>
    </div>

    <div style="margin-top:1rem">{{ $questionnaires->links('components.pagination') }}</div>

  </div>
</div>
@endsection
