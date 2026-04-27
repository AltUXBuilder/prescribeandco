import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { Category } from './entities/category.entity';
import { QuestionnairesService } from '../questionnaires/questionnaires.service';
import {
  CreateProductDto,
  PaginatedProductsDto,
  ProductQueryDto,
  ProductResponseDto,
  UpdateProductDto,
} from './dto/products.dto';
import { MedicineType, ProductStatus } from '../../common/enums/medicine-type.enum';
import { plainToInstance } from 'class-transformer';
import { AuditHelper } from '../audit/audit.helper';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,

    private readonly questionnairesService: QuestionnairesService,
    private readonly auditHelper: AuditHelper,
  ) {}

  // ── Create ─────────────────────────────────────────────────────────────────

  async create(dto: CreateProductDto, adminId: string): Promise<Product> {
    this.enforceClassificationRules(dto);

    if (dto.requiresQuestionnaire && dto.questionnaireId) {
      await this.questionnairesService.findById(dto.questionnaireId);
    }

    if (dto.categoryId) {
      await this.findCategoryOrThrow(dto.categoryId);
    }

    const slug = dto.slug ?? this.generateSlug(dto.name);
    await this.assertSlugUnique(slug);

    const product = this.productRepo.create({
      ...dto,
      slug,
      questionnaireId: dto.questionnaireId ?? null,
      categoryId: dto.categoryId ?? null,
      status: ProductStatus.ACTIVE,
    });

    const saved = await this.productRepo.save(product);

    await this.auditHelper.logProductCreated(adminId, saved.id, {
      name: saved.name,
      slug: saved.slug,
      medicineType: saved.medicineType,
      requiresPrescription: saved.requiresPrescription,
      requiresQuestionnaire: saved.requiresQuestionnaire,
      pricePence: saved.pricePence,
      questionnaireId: saved.questionnaireId,
    });

    return saved;
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateProductDto, adminId: string): Promise<Product> {
    const product = await this.findById(id);

    // Snapshot before state for diff
    const before: Record<string, unknown> = {
      name: product.name,
      medicineType: product.medicineType,
      requiresPrescription: product.requiresPrescription,
      requiresQuestionnaire: product.requiresQuestionnaire,
      pricePence: product.pricePence,
      status: product.status,
      questionnaireId: product.questionnaireId,
    };

    const prevQuestionnaireId = product.questionnaireId;

    Object.assign(product, dto);
    this.enforceClassificationRules(product);

    if (dto.questionnaireId !== undefined) {
      if (dto.questionnaireId !== null) {
        const q = await this.questionnairesService.findById(dto.questionnaireId);
        if (!q.isActive) {
          throw new BadRequestException(
            `Questionnaire ${dto.questionnaireId} is inactive and cannot be assigned`,
          );
        }
      }
      product.questionnaireId = dto.questionnaireId;
    }

    if (dto.requiresQuestionnaire === false) {
      product.questionnaireId = null;
    }

    if (dto.categoryId !== undefined) {
      if (dto.categoryId !== null) await this.findCategoryOrThrow(dto.categoryId);
      product.categoryId = dto.categoryId;
    }

    const saved = await this.productRepo.save(product);

    const after: Record<string, unknown> = {
      name: saved.name,
      medicineType: saved.medicineType,
      requiresPrescription: saved.requiresPrescription,
      requiresQuestionnaire: saved.requiresQuestionnaire,
      pricePence: saved.pricePence,
      status: saved.status,
      questionnaireId: saved.questionnaireId,
    };

    await this.auditHelper.logProductUpdated(adminId, id, before, after);

    // Emit a specific questionnaire assignment event when that link changed
    if (dto.questionnaireId !== undefined && dto.questionnaireId !== prevQuestionnaireId) {
      await this.auditHelper.logProductQuestionnaireAssigned(
        adminId, id, dto.questionnaireId, prevQuestionnaireId,
      );
    }

    return saved;
  }

  async archive(id: string, adminId: string): Promise<Product> {
    const product = await this.findById(id);
    product.status = ProductStatus.ARCHIVED;
    const saved = await this.productRepo.save(product);
    await this.auditHelper.logProductArchived(adminId, id, product.name);
    return saved;
  }

  // ── Read ───────────────────────────────────────────────────────────────────

  async findById(id: string, withRelations = false): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: withRelations ? ['category', 'questionnaire'] : [],
    });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  async findBySlug(slug: string): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { slug },
      relations: ['category', 'questionnaire'],
    });
    if (!product) throw new NotFoundException(`Product "${slug}" not found`);
    return product;
  }

  async findAll(query: ProductQueryDto): Promise<PaginatedProductsDto> {
    const { page = 1, limit = 20, search, ...filters } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.medicineType) where.medicineType = filters.medicineType;
    if (filters.status) where.status = filters.status;
    if (filters.requiresPrescription !== undefined)
      where.requiresPrescription = filters.requiresPrescription;
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (search) where.name = ILike(`%${search}%`);

    const [products, total] = await this.productRepo.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
      relations: ['category'],
    });

    return {
      data: products.map((p) =>
        plainToInstance(ProductResponseDto, p, { excludeExtraneousValues: true }),
      ),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getProductQuestionnaire(productId: string) {
    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: ['questionnaire'],
    });

    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    if (!product.requiresQuestionnaire || !product.questionnaire) {
      return { requiresQuestionnaire: false, questionnaire: null };
    }

    return {
      requiresQuestionnaire: true,
      questionnaire: product.questionnaire,
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private enforceClassificationRules(
    dto: Partial<CreateProductDto & Product>,
  ): void {
    if (dto.medicineType === MedicineType.POM && !dto.requiresPrescription) {
      throw new BadRequestException(
        'POM (Prescription Only Medicine) products must have requiresPrescription set to true',
      );
    }

    if (dto.requiresQuestionnaire && !dto.questionnaireId) {
      throw new BadRequestException(
        'A questionnaireId must be provided when requiresQuestionnaire is true',
      );
    }

    if (dto.questionnaireId && !dto.requiresQuestionnaire) {
      throw new BadRequestException(
        'requiresQuestionnaire must be true when a questionnaireId is assigned',
      );
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 220);
  }

  private async assertSlugUnique(slug: string): Promise<void> {
    const existing = await this.productRepo.findOne({ where: { slug } });
    if (existing) {
      throw new BadRequestException(
        `A product with slug "${slug}" already exists. Provide a unique slug.`,
      );
    }
  }

  private async findCategoryOrThrow(id: string): Promise<Category> {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) throw new NotFoundException(`Category ${id} not found`);
    return category;
  }
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,

    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,

    private readonly questionnairesService: QuestionnairesService,
  ) {}

  // ── Create ─────────────────────────────────────────────────────────────────

  async create(dto: CreateProductDto): Promise<Product> {
    // Enforce classification rules
    this.enforceClassificationRules(dto);

    // Validate questionnaire linkage
    if (dto.requiresQuestionnaire && dto.questionnaireId) {
      await this.questionnairesService.findById(dto.questionnaireId); // throws if not found
    }

    // Validate category
    if (dto.categoryId) {
      await this.findCategoryOrThrow(dto.categoryId);
    }

    const slug = dto.slug ?? this.generateSlug(dto.name);
    await this.assertSlugUnique(slug);

    const product = this.productRepo.create({
      ...dto,
      slug,
      questionnaireId: dto.questionnaireId ?? null,
      categoryId: dto.categoryId ?? null,
      status: ProductStatus.ACTIVE,
    });

    return this.productRepo.save(product);
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findById(id);

    // Merge update fields
    Object.assign(product, dto);

    // Re-enforce classification rules after merge
    this.enforceClassificationRules(product);

    // If questionnaire is being set, validate it exists and is active
    if (dto.questionnaireId !== undefined) {
      if (dto.questionnaireId !== null) {
        const q = await this.questionnairesService.findById(dto.questionnaireId);
        if (!q.isActive) {
          throw new BadRequestException(
            `Questionnaire ${dto.questionnaireId} is inactive and cannot be assigned`,
          );
        }
      }
      product.questionnaireId = dto.questionnaireId;
    }

    // When requiresQuestionnaire is set to false, clear the link
    if (dto.requiresQuestionnaire === false) {
      product.questionnaireId = null;
    }

    if (dto.categoryId !== undefined) {
      if (dto.categoryId !== null) await this.findCategoryOrThrow(dto.categoryId);
      product.categoryId = dto.categoryId;
    }

    return this.productRepo.save(product);
  }

  async archive(id: string): Promise<Product> {
    const product = await this.findById(id);
    product.status = ProductStatus.ARCHIVED;
    return this.productRepo.save(product);
  }

  // ── Read ───────────────────────────────────────────────────────────────────

  async findById(id: string, withRelations = false): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: withRelations ? ['category', 'questionnaire'] : [],
    });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  async findBySlug(slug: string): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { slug },
      relations: ['category', 'questionnaire'],
    });
    if (!product) throw new NotFoundException(`Product "${slug}" not found`);
    return product;
  }

  async findAll(query: ProductQueryDto): Promise<PaginatedProductsDto> {
    const { page = 1, limit = 20, search, ...filters } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.medicineType) where.medicineType = filters.medicineType;
    if (filters.status) where.status = filters.status;
    if (filters.requiresPrescription !== undefined)
      where.requiresPrescription = filters.requiresPrescription;
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (search) where.name = ILike(`%${search}%`);

    const [products, total] = await this.productRepo.findAndCount({
      where,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
      relations: ['category'],
    });

    return {
      data: products.map((p) =>
        plainToInstance(ProductResponseDto, p, { excludeExtraneousValues: true }),
      ),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Fetch the questionnaire linked to a product.
   * Used by the customer journey: product detail page loads its questionnaire
   * schema so the frontend can render the form before submission.
   */
  async getProductQuestionnaire(productId: string) {
    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: ['questionnaire'],
    });

    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    if (!product.requiresQuestionnaire || !product.questionnaire) {
      return { requiresQuestionnaire: false, questionnaire: null };
    }

    return {
      requiresQuestionnaire: true,
      questionnaire: product.questionnaire,
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Business rules for UK medicine classification:
   *   - POM always requires a prescription
   *   - P and GSL may require a questionnaire but not a prescription by default
   *   - requiresQuestionnaire must be true if a questionnaireId is supplied
   */
  private enforceClassificationRules(
    dto: Partial<CreateProductDto & Product>,
  ): void {
    if (dto.medicineType === MedicineType.POM && !dto.requiresPrescription) {
      throw new BadRequestException(
        'POM (Prescription Only Medicine) products must have requiresPrescription set to true',
      );
    }

    if (dto.requiresQuestionnaire && !dto.questionnaireId) {
      throw new BadRequestException(
        'A questionnaireId must be provided when requiresQuestionnaire is true',
      );
    }

    if (dto.questionnaireId && !dto.requiresQuestionnaire) {
      throw new BadRequestException(
        'requiresQuestionnaire must be true when a questionnaireId is assigned',
      );
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')  // strip special chars
      .replace(/[\s_]+/g, '-')   // spaces/underscores → hyphens
      .replace(/-+/g, '-')       // collapse multiple hyphens
      .slice(0, 220);
  }

  private async assertSlugUnique(slug: string): Promise<void> {
    const existing = await this.productRepo.findOne({ where: { slug } });
    if (existing) {
      throw new BadRequestException(
        `A product with slug "${slug}" already exists. Provide a unique slug.`,
      );
    }
  }

  private async findCategoryOrThrow(id: string): Promise<Category> {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) throw new NotFoundException(`Category ${id} not found`);
    return category;
  }
}
