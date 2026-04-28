@if ($paginator->hasPages())
  <nav class="pagination" role="navigation">
    @if ($paginator->onFirstPage())
      <span class="page-link" style="opacity:.4">&laquo;</span>
    @else
      <a href="{{ $paginator->previousPageUrl() }}" class="page-link">&laquo;</a>
    @endif

    @foreach ($elements as $element)
      @if (is_string($element))
        <span class="page-link" style="opacity:.4">…</span>
      @endif
      @if (is_array($element))
        @foreach ($element as $page => $url)
          @if ($page == $paginator->currentPage())
            <span class="page-link active">{{ $page }}</span>
          @else
            <a href="{{ $url }}" class="page-link">{{ $page }}</a>
          @endif
        @endforeach
      @endif
    @endforeach

    @if ($paginator->hasMorePages())
      <a href="{{ $paginator->nextPageUrl() }}" class="page-link">&raquo;</a>
    @else
      <span class="page-link" style="opacity:.4">&raquo;</span>
    @endif
  </nav>
@endif
