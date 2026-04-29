<?php

namespace App\Services;

use App\Enums\AuditAction;
use App\Enums\MedicineType;
use App\Enums\ProductStatus;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Support\Str;
use Ramsey\Uuid\Uuid;

class ProductService
{
    public function __construct(private AuditService $audit) {}

    public function create(array $data, string $adminId): Product
    {
        $this->enforceClassificationRules($data);

        $slug = $data['slug'] ?? $this->generateSlug($data['name']);
        $this->assertSlugUnique($slug);

        if (!empty($data['category_id'])) {
            Category::findOrFail($data['category_id']);
        }

        $product = Product::create([
            'id'                     => Uuid::uuid4()->toString(),
            'category_id'            => $data['category_id'] ?? null,
            'questionnaire_id'       => $data['questionnaire_id'] ?? null,
            'name'                   => $data['name'],
            'slug'                   => $slug,
            'description'            => $data['description'] ?? null,
            'bnf_code'               => $data['bnf_code'] ?? null,
            'medicine_type'          => $data['medicine_type'],
            'requires_prescription'  => $data['requires_prescription'],
            'requires_questionnaire' => $data['requires_questionnaire'] ?? false,
            'price_pence'            => $data['price_pence'],
            'status'                 => ProductStatus::ACTIVE,
            'stock_count'            => $data['stock_count'] ?? null,
        ]);

        $this->audit->log($adminId, AuditAction::PRODUCT_CREATED, 'Product', $product->id,
            null, ['name' => $product->name, 'slug' => $product->slug, 'medicine_type' => $data['medicine_type']]);

        return $product;
    }

    public function update(string $id, array $data, string $adminId): Product
    {
        $product = $this->findById($id);
        $before  = $product->only(['name', 'status', 'price_pence', 'medicine_type']);

        $merged = array_merge($product->toArray(), array_filter($data, fn($v) => $v !== null));
        $this->enforceClassificationRules($merged);

        if (isset($data['slug']) && $data['slug'] !== $product->slug) {
            $this->assertSlugUnique($data['slug']);
        }

        $product->update(array_filter($data, fn($v) => $v !== null));

        $this->audit->log($adminId, AuditAction::PRODUCT_UPDATED, 'Product', $id,
            $before, $product->fresh()->only(['name', 'status', 'price_pence', 'medicine_type']));

        return $product->fresh();
    }

    public function archive(string $id, string $adminId): Product
    {
        $product = $this->findById($id);
        $product->update(['status' => ProductStatus::ARCHIVED]);
        $this->audit->log($adminId, AuditAction::PRODUCT_ARCHIVED, 'Product', $id);
        return $product->fresh();
    }

    public function findById(string $id, bool $withRelations = false): Product
    {
        $q = Product::query();
        if ($withRelations) $q->with(['category', 'questionnaire']);
        $p = $q->find($id);
        if (!$p) abort(404, "Product {$id} not found");
        return $p;
    }

    public function findBySlug(string $slug): Product
    {
        $p = Product::with(['category', 'questionnaire'])->where('slug', $slug)->first();
        if (!$p) abort(404, "Product with slug \"{$slug}\" not found");
        return $p;
    }

    public function findAll(array $query): array
    {
        $page  = (int) ($query['page'] ?? 1);
        $limit = min((int) ($query['limit'] ?? 20), 100);

        $q = Product::query();

        if (!empty($query['status'])) {
            $q->where('status', $query['status']);
        } else {
            $q->where('status', ProductStatus::ACTIVE->value);
        }
        if (!empty($query['medicine_type']))       $q->where('medicine_type', $query['medicine_type']);
        if (isset($query['requires_prescription'])) $q->where('requires_prescription', (bool) $query['requires_prescription']);
        if (!empty($query['category_id']))         $q->where('category_id', $query['category_id']);
        if (!empty($query['search'])) {
            $q->where('name', 'like', '%' . $query['search'] . '%');
        }

        $total = $q->count();
        $data  = $q->orderBy('name')->offset(($page - 1) * $limit)->limit($limit)->get();

        return [
            'data'        => $data,
            'total'       => $total,
            'page'        => $page,
            'limit'       => $limit,
            'total_pages' => (int) ceil($total / $limit),
        ];
    }

    public function getQuestionnaire(string $productId): array
    {
        $p = $this->findById($productId, withRelations: true);

        return [
            'requires_questionnaire' => $p->requires_questionnaire,
            'questionnaire'          => $p->requires_questionnaire ? $p->questionnaire : null,
        ];
    }

    // ── Rules ──────────────────────────────────────────────────────────────────

    private function enforceClassificationRules(array $data): void
    {
        $type = is_string($data['medicine_type'] ?? null)
            ? MedicineType::from($data['medicine_type'])
            : ($data['medicine_type'] ?? null);

        if ($type === MedicineType::POM && empty($data['requires_prescription'])) {
            abort(400, 'POM products must require a prescription');
        }
        if (!empty($data['requires_questionnaire']) && empty($data['questionnaire_id'])) {
            abort(400, 'A questionnaire ID is required when requires_questionnaire is true');
        }
        if (!empty($data['questionnaire_id']) && empty($data['requires_questionnaire'])) {
            abort(400, 'requires_questionnaire must be true when a questionnaire is assigned');
        }
    }

    private function generateSlug(string $name): string
    {
        return Str::slug($name);
    }

    private function assertSlugUnique(string $slug): void
    {
        if (Product::where('slug', $slug)->exists()) {
            abort(400, "Slug \"{$slug}\" is already in use");
        }
    }
}
