import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { LocationsRepository } from '../repositories/locations.repository';
import { BrandsRepository } from '../../brands/repositories/brands.repository';
import { AuditLogsService } from '../../audit/services/audit-logs.service';
import { CreateLocationDto } from '../dto/create-location.dto';
import { UpdateLocationDto } from '../dto/update-location.dto';
import { ListLocationsQueryDto } from '../dto/list-locations.dto';

@Injectable()
export class LocationsService {
  constructor(
    private readonly repo: LocationsRepository,
    private readonly brandsRepo: BrandsRepository,
    private readonly audit: AuditLogsService,
  ) {}

  async create(
    ctx: { organizationId: string; userId?: string },
    dto: CreateLocationDto,
  ) {
    const brandExists = await this.brandsRepo.existsInOrg(
      ctx.organizationId,
      dto.brandId,
    );
    if (!brandExists) {
      throw new BadRequestException('Brand not found or does not belong to organization');
    }

    const name = dto.name?.trim();
    const timezone = dto.timezone?.trim();
    if (!name) throw new BadRequestException('Name is required');
    if (!timezone) throw new BadRequestException('Timezone is required');

    const created = await this.repo.create(ctx.organizationId, {
      brandId: dto.brandId,
      name,
      timezone,
    });
    await this.audit.recordWrite('LOCATION_CREATE', ctx, created.id, {
      after: created,
    });
    return created;
  }

  async getById(ctx: { organizationId: string }, id: string) {
    const location = await this.repo.findById(ctx.organizationId, id);
    if (!location) throw new NotFoundException('Location not found');
    return location;
  }

  async list(ctx: { organizationId: string }, query?: ListLocationsQueryDto) {
    return this.repo.findMany(ctx.organizationId, {
      brandId: query?.brandId,
    });
  }

  async update(
    ctx: { organizationId: string; userId?: string },
    id: string,
    dto: UpdateLocationDto,
  ) {
    const existing = await this.getById(ctx, id);

    if (dto.brandId !== undefined) {
      const brandExists = await this.brandsRepo.existsInOrg(
        ctx.organizationId,
        dto.brandId,
      );
      if (!brandExists) {
        throw new BadRequestException(
          'Brand not found or does not belong to organization',
        );
      }
    }

    const name = dto.name?.trim();
    const timezone = dto.timezone?.trim();
    if (dto.name !== undefined && !name) {
      throw new BadRequestException('Name cannot be empty');
    }
    if (dto.timezone !== undefined && !timezone) {
      throw new BadRequestException('Timezone cannot be empty');
    }

    const updated = await this.repo.update(ctx.organizationId, id, {
      brandId: dto.brandId,
      name: dto.name !== undefined ? name! : undefined,
      timezone: dto.timezone !== undefined ? timezone! : undefined,
    });
    await this.audit.recordWrite('LOCATION_UPDATE', ctx, id, {
      before: existing,
      after: updated,
    });
    return updated!;
  }
}
