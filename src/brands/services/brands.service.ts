import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { BrandsRepository } from '../repositories/brands.repository';
import { AuditLogsService } from '../../audit/services/audit-logs.service';
import { CreateBrandDto } from '../dto/create-brand.dto';
import { UpdateBrandDto } from '../dto/update-brand.dto';

@Injectable()
export class BrandsService {
  constructor(
    private readonly repo: BrandsRepository,
    private readonly audit: AuditLogsService,
  ) {}

  async create(
    ctx: { organizationId: string; userId?: string },
    dto: CreateBrandDto,
  ) {
    const name = dto.name?.trim();
    if (!name) {
      throw new BadRequestException('Name is required');
    }

    const created = await this.repo.create(ctx.organizationId, { name });
    await this.audit.recordWrite('BRAND_CREATE', ctx, created.id, {
      after: created,
    });
    return created;
  }

  async getById(ctx: { organizationId: string }, id: string) {
    const brand = await this.repo.findById(ctx.organizationId, id);
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  async list(ctx: { organizationId: string }) {
    return this.repo.findMany(ctx.organizationId);
  }

  async update(
    ctx: { organizationId: string; userId?: string },
    id: string,
    dto: UpdateBrandDto,
  ) {
    const existing = await this.getById(ctx, id);

    const name = dto.name?.trim();
    if (dto.name !== undefined && !name) {
      throw new BadRequestException('Name cannot be empty');
    }

    const updated = await this.repo.update(ctx.organizationId, id, {
      name: dto.name !== undefined ? name! : undefined,
    });
    await this.audit.recordWrite('BRAND_UPDATE', ctx, id, {
      before: existing,
      after: updated,
    });
    return updated!;
  }
}
