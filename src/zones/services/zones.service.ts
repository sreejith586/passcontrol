import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ZonesRepository } from '../repositories/zones.repository';
import { LocationsRepository } from '../../locations/repositories/locations.repository';
import { AuditLogsService } from '../../audit/services/audit-logs.service';
import { CreateZoneDto } from '../dto/create-zone.dto';
import { UpdateZoneDto } from '../dto/update-zone.dto';
import { ListZonesQueryDto } from '../dto/list-zones.dto';

@Injectable()
export class ZonesService {
  constructor(
    private readonly repo: ZonesRepository,
    private readonly locationsRepo: LocationsRepository,
    private readonly audit: AuditLogsService,
  ) {}

  async create(
    ctx: { organizationId: string; userId?: string },
    dto: CreateZoneDto,
  ) {
    const locationExists = await this.locationsRepo.existsInOrg(
      ctx.organizationId,
      dto.locationId,
    );
    if (!locationExists) {
      throw new BadRequestException(
        'Location not found or does not belong to organization',
      );
    }

    const name = dto.name?.trim();
    if (!name) throw new BadRequestException('Name is required');

    const created = await this.repo.create(ctx.organizationId, {
      locationId: dto.locationId,
      name,
    });
    await this.audit.recordWrite('ZONE_CREATE', ctx, created.id, {
      after: created,
    });
    return created;
  }

  async getById(ctx: { organizationId: string }, id: string) {
    const zone = await this.repo.findById(ctx.organizationId, id);
    if (!zone) throw new NotFoundException('Zone not found');
    return zone;
  }

  async list(ctx: { organizationId: string }, query?: ListZonesQueryDto) {
    return this.repo.findMany(ctx.organizationId, {
      locationId: query?.locationId,
    });
  }

  async update(
    ctx: { organizationId: string; userId?: string },
    id: string,
    dto: UpdateZoneDto,
  ) {
    const existing = await this.getById(ctx, id);

    if (dto.locationId !== undefined) {
      const locationExists = await this.locationsRepo.existsInOrg(
        ctx.organizationId,
        dto.locationId,
      );
      if (!locationExists) {
        throw new BadRequestException(
          'Location not found or does not belong to organization',
        );
      }
    }

    const name = dto.name?.trim();
    if (dto.name !== undefined && !name) {
      throw new BadRequestException('Name cannot be empty');
    }

    const updated = await this.repo.update(ctx.organizationId, id, {
      locationId: dto.locationId,
      name: dto.name !== undefined ? name! : undefined,
    });
    await this.audit.recordWrite('ZONE_UPDATE', ctx, id, {
      before: existing,
      after: updated,
    });
    return updated!;
  }
}
