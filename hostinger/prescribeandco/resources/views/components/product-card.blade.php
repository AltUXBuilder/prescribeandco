<a href="{{ route('products.show', $product->slug) }}" class="product-card" style="display:block;text-decoration:none">
  <div class="product-card-img">
    @php
      $icons = ['POM' => '💊', 'P' => '🧴', 'GSL' => '🌿'];
    @endphp
    {{ $icons[$product->medicine_type->value] ?? '💊' }}
  </div>
  <div class="product-card-body">
    @if($product->category)
      <p class="product-card-category">{{ $product->category->name }}</p>
    @endif
    <h3 class="product-card-name">{{ $product->name }}</h3>
    @if($product->description)
      <p class="product-card-desc">{{ Str::limit(strip_tags($product->description), 80) }}</p>
    @endif
    <div class="product-card-footer">
      <span class="product-price">{{ $product->formatted_price }}</span>
      @if($product->requires_prescription)
        <span class="badge badge-lavender">Rx</span>
      @endif
    </div>
  </div>
</a>
