import { Expose, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { MedicineType, ProductStatus } from '../../../common/enums/medicine-type.enum';

// ── Create ────────────────────────────────────────────────────────────────────

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  /**
   * URL-safe slug — generated from `name` by the service if omitted,
   * but can be overridden explicitly.
   */
  @IsOptional()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase, hyphens only (e.g. "paracetamol-500mg")',
  })
  @MaxLength(220)
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{1}$/, { message: 'BNF code format: XXXX-X' })
  bnfCode?: string;

  @IsEnum(MedicineType)
  medicineType: MedicineType;

  @IsBoolean()
  requiresPrescription: boolean;

  @IsBoolean()
  requiresQuestionnaire: boolean;

  /**
   * Questionnaire UUID — required when requiresQuestionnaire is true.
   * Validated by a custom service-layer check after this DTO passes.
   */
  @ValidateIf((o) => o.requiresQuestionnaire === true)
  @IsUUID('4', { message: 'questionnaireId must be a valid UUID when requiresQuestionnaire is true' })
  questionnaireId?: string;

  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  /** Price in pence — enforces integer storage */
  @IsInt({ message: 'pricePence must be a whole number in pence (e.g. 999 = £9.99)' })
  @Min(1)
  @Max(99999999) // ~£999,999
  pricePence: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  stockCount?: number;
}

// ── Update (all fields optional) ─────────────────────────────────────────────

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(MedicineType)
  medicineType?: MedicineType;

  @IsOptional()
  @IsBoolean()
  requiresPrescription?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresQuestionnaire?: boolean;

  @IsOptional()
  @IsUUID('4')
  questionnaireId?: string | null;

  @IsOptional()
  @IsUUID('4')
  categoryId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  pricePence?: number;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  stockCount?: number | null;
}

// ── Query / filter ────────────────────────────────────────────────────────────

export class ProductQueryDto {
  @IsOptional()
  @IsEnum(MedicineType)
  medicineType?: MedicineType;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  requiresPrescription?: boolean;

  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}

// ── Response ──────────────────────────────────────────────────────────────────

export class ProductResponseDto {
  @Expose() id: string;
  @Expose() name: string;
  @Expose() slug: string;
  @Expose() description: string | null;
  @Expose() bnfCode: string | null;
  @Expose() medicineType: MedicineType;
  @Expose() requiresPrescription: boolean;
  @Expose() requiresQuestionnaire: boolean;
  @Expose() questionnaireId: string | null;
  @Expose() categoryId: string | null;
  @Expose() pricePence: number;
  @Expose() formattedPrice: string;
  @Expose() status: ProductStatus;
  @Expose() stockCount: number | null;
  @Expose() isAvailable: boolean;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
}

export class PaginatedProductsDto {
  @Expose() data: ProductResponseDto[];
  @Expose() total: number;
  @Expose() page: number;
  @Expose() limit: number;
  @Expose() totalPages: number;
}
