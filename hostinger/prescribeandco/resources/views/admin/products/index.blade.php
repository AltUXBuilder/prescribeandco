@extends('layouts.app')
@section('title', 'Products — Admin')

@section('content')
<div style="background:var(--white);border-bottom:1px solid var(--border);padding:2.5rem 0">
  <div class="container">
    <a href="{{ route('admin.index') }}" style="font-size:.875rem;color:var(--charcoal-muted);display:inline-flex;align-items:center;gap:.4rem;margin-bottom:1rem">← Dashboard</a>
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem">
      <h1 style="font-size:1.75rem">Products</h1>
      <a href="{{ route('admin.products.create') }}" class="btn btn-primary btn-sm">+ Add product</a>
    </div>
  </div>
</div>

<div class="section">
  <div class="container">

    @if(session('success'))
      <div class="alert alert-success" style="margin-bottom:1.5rem">{{ session('success') }}</div>
    @endif

    <form method="GET" style="display:flex;gap:.75rem;flex-wrap:wrap;margin-bottom:1.5rem">
      <input type="text" name="search" value="{{ request('search') }}" placeholder="Search name or BNF code…"
        style="padding:.45rem .75rem;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:.9rem;min-width:220px">
      <select name="status" style="padding:.45rem .75rem;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:.9rem">
        <option value="">All statuses</option>
        @foreach(['ACTIVE','INACTIVE','ARCHIVED'] as $s)
          <option value="{{ $s }}" @selected(request('status') === $s)>{{ $s }}</option>
        @endforeach
      </select>
      <select name="category" style="padding:.45rem .75rem;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:.9rem">
        <option value="">All categories</option>
        @foreach($categories as $cat)
          <option value="{{ $cat->id }}" @selected(request('category') === $cat->id)>{{ $cat->name }}</option>
        @endforeach
      </select>
      <button type="submit" class="btn btn-secondary btn-sm">Filter</button>
      @if(request()->hasAny(['search','status','category']))
        <a href="{{ route('admin.products') }}" class="btn btn-secondary btn-sm">Clear</a>
      @endif
    </form>

    <div class="card" style="overflow:hidden">
      <table class="rx-table">
        <thead>
          <tr><th>Name</th><th>Category</th><th>Type</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          @forelse($products as $product)
          <tr>
            <td>
              <strong>{{ $product->name }}</strong>
              @if($product->bnf_code)<br><span class="text-muted" style="font-size:.78rem">BNF: {{ $product->bnf_code }}</span>@endif
            </td>
            <td class="text-muted text-sm">{{ $product->category->name ?? '—' }}</td>
            <td><span class="badge badge-lavender">{{ $product->medicine_type->value }}</span></td>
            <td>{{ $product->formatted_price }}</td>
            <td class="text-sm">{{ $product->stock_count ?? '∞' }}</td>
            <td>
              @if($product->status->value === 'ACTIVE')
                <span class="badge" style="background:#F0F6F1;color:#2D6A4F">Active</span>
              @elseif($product->status->value === 'INACTIVE')
                <span class="badge" style="background:#FBF7ED;color:#7A5C00">Inactive</span>
              @else
                <span class="badge" style="background:#F0EFED;color:var(--charcoal-muted)">Archived</span>
              @endif
            </td>
            <td style="white-space:nowrap">
              <a href="{{ route('admin.products.edit', $product->id) }}" class="btn btn-secondary btn-sm" style="margin-right:.4rem">Edit</a>
              @if($product->status->value !== 'ARCHIVED')
              <form method="POST" action="{{ route('admin.products.archive', $product->id) }}" style="display:inline"
                    onsubmit="return confirm('Archive {{ addslashes($product->name) }}?')">
                @csrf
                <button type="submit" class="btn btn-secondary btn-sm" style="color:var(--red);border-color:var(--red)">Archive</button>
              </form>
              @endif
            </td>
          </tr>
          @empty
          <tr><td colspan="7" class="text-muted text-sm" style="padding:2rem;text-align:center">No products found.</td></tr>
          @endforelse
        </tbody>
      </table>
    </div>

    <div style="margin-top:1rem">{{ $products->links('components.pagination') }}</div>

  </div>
</div>
@endsection
