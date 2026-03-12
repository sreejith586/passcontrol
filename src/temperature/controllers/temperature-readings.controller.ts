import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { TemperatureReadingsService } from '../services/temperature-readings.service';
import { CreateTemperatureReadingDto } from '../dto/create-temperature-reading.dto';
import { ListTemperatureReadingsQueryDto } from '../dto/list-temperature-readings.dto';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { RbacGuard } from '../../access/rbac/rbac.guard';
import { RequirePermissions } from '../../access/rbac/permissions.decorator';
import { ApiResponse } from '../../infra/responses/api-response';
import { CurrentTenantContext } from '../../access/decorators/current-tenant.decorator';
import { AlertEventsService } from '../../alert-events/services/alert-events.service';

@Controller({ path: 'temperature-readings', version: '1' })
@UseGuards(AuthGuard, RbacGuard)
export class TemperatureReadingsController {
  constructor(
    private readonly service: TemperatureReadingsService,
    private readonly alertEvents: AlertEventsService,
  ) {}

  @Post()
  @RequirePermissions('temperature.reading.create')
  async create(
    @CurrentTenantContext() ctx: { organizationId: string; userId?: string },
    @Body() dto: CreateTemperatureReadingDto,
  ) {
    const createAlert = (payload: Parameters<AlertEventsService['createFromPayload']>[0]) =>
      this.alertEvents.createFromPayload(payload);
    const reading = await this.service.create(ctx, dto, createAlert);
    return ApiResponse.created(reading);
  }

  @Get()
  @RequirePermissions('temperature.reading.view')
  async list(
    @CurrentTenantContext() ctx: { organizationId: string },
    @Query() query: ListTemperatureReadingsQueryDto,
  ) {
    const list = await this.service.list(ctx, query);
    return ApiResponse.ok(list);
  }

  @Get(':id')
  @RequirePermissions('temperature.reading.view')
  async get(
    @CurrentTenantContext() ctx: { organizationId: string },
    @Param('id') id: string,
  ) {
    const reading = await this.service.getById(ctx, id);
    return ApiResponse.ok(reading);
  }
}
