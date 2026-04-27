import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import {
  CreateProductDto,
  PaginatedProductsDto,
  ProductQueryDto,
  ProductResponseDto,
  UpdateProductDto,
} from './dto/products.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { plainToInstance } from 'class-transformer';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ── Public catalogue ───────────────────────────────────────────────────────

  /**
   * GET /products
   * Public — paginated catalogue with optional filters.
   * By default returns only ACTIVE products.
   */
  @Public()
  @Get()
  async findAll(@Query() query: ProductQueryDto): Promise<PaginatedProductsDto> {
    return this.productsService.findAll(query);
  }

  /**
   * GET /products/:id
   * Public — full product detail including category.
   */
  @Public()
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProductResponseDto> {
    const product = await this.productsService.findById(id, true);
    return plainToInstance(ProductResponseDto, product, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * GET /products/slug/:slug
   * Public — fetch by URL slug (used by Next.js product pages).
   */
  @Public()
  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string): Promise<ProductResponseDto> {
    const product = await this.productsService.findBySlug(slug);
    return plainToInstance(ProductResponseDto, product, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * GET /products/:id/questionnaire
   * Authenticated (any role) — returns the questionnaire schema for a product.
   * Returns { requiresQuestionnaire: false, questionnaire: null } for non-gated products.
   * The customer UI calls this on product detail load to decide whether to render the form.
   */
  @Get(':id/questionnaire')
  async getQuestionnaire(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.getProductQuestionnaire(id);
  }

  // ── Admin management ───────────────────────────────────────────────────────

  /**
   * POST /products
   * ADMIN only — create a new product. Classification rules are enforced.
   */
  @Post()
  @Roles(Role.ADMIN)
  async create(
    @Body() dto: CreateProductDto,
    @CurrentUser('id') adminId: string,
  ): Promise<ProductResponseDto> {
    const product = await this.productsService.create(dto, adminId);
    return plainToInstance(ProductResponseDto, product, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * PATCH /products/:id
   * ADMIN only — update any product field including questionnaire assignment.
   */
  @Patch(':id')
  @Roles(Role.ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser('id') adminId: string,
  ): Promise<ProductResponseDto> {
    const product = await this.productsService.update(id, dto, adminId);
    return plainToInstance(ProductResponseDto, product, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * DELETE /products/:id
   * ADMIN only — archive (soft-delete). Does not destroy product records.
   */
  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
  ): Promise<void> {
    await this.productsService.archive(id, adminId);
  }
}
