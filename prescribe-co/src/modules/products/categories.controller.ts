import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { Public } from '../../common/decorators/public.decorator';

interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
}

@Controller('categories')
export class CategoriesController {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  /**
   * GET /categories
   * Public — list all categories, ordered by sortOrder then name.
   * Optional ?parentId=<uuid>  → children of that parent.
   * Optional ?parentId=null    → top-level (parentless) categories.
   */
  @Public()
  @Get()
  async findAll(@Query('parentId') parentId?: string): Promise<CategoryDto[]> {
    const where: Record<string, unknown> = {};
    if (parentId !== undefined) {
      where.parentId = parentId === 'null' ? null : parentId;
    }
    const cats = await this.categoryRepo.find({
      where,
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
    return cats.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      parentId: c.parentId,
      sortOrder: c.sortOrder,
    }));
  }

  /**
   * GET /categories/slug/:slug
   * Public — fetch a single category by its URL slug.
   */
  @Public()
  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string): Promise<CategoryDto> {
    const cat = await this.categoryRepo.findOne({ where: { slug } });
    if (!cat) throw new NotFoundException(`Category "${slug}" not found`);
    return {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      parentId: cat.parentId,
      sortOrder: cat.sortOrder,
    };
  }
}
