import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ChecklistSchedulesService } from '../services/checklist-schedules.service';
import { CreateScheduleDto } from '../dto/create-schedule.dto';
import { UpdateScheduleDto } from '../dto/update-schedule.dto';
import { ListSchedulesQueryDto } from '../dto/list-schedules.dto';
import { JwtAuthGuard } from '../../../auth/guards/auth.guard';
import { RbacGuard } from '../../../access/rbac/rbac.guard';
import { RequirePermissions } from '../../../access/rbac/permissions.decorator';
import { ApiResponse } from '../../../infra/responses/api-response';
import {
  CurrentTenantContext,
  TenantContext,
} from '../../../access/decorators/current-tenant.decorator';

@Controller({ path: 'checklist-schedules', version: '1' })
@UseGuards(JwtAuthGuard, RbacGuard)
export class ChecklistSchedulesController {
  constructor(private readonly service: ChecklistSchedulesService) {}

  @Post()
  @RequirePermissions('checklist.schedule.create')
  async create(
    @CurrentTenantContext() ctx: TenantContext,
    @Body() dto: CreateScheduleDto,
  ) {
    const schedule = await this.service.create(ctx, dto);
    return ApiResponse.created(schedule);
  }

  @Get()
  @RequirePermissions('checklist.schedule.view')
  async list(
    @CurrentTenantContext() ctx: TenantContext,
    @Query() query: ListSchedulesQueryDto,
  ) {
    const list = await this.service.list(ctx, query);
    return ApiResponse.ok(list);
  }

  @Get(':id')
  @RequirePermissions('checklist.schedule.view')
  async get(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
  ) {
    const schedule = await this.service.getById(ctx, id);
    return ApiResponse.ok(schedule);
  }

  @Patch(':id')
  @RequirePermissions('checklist.schedule.update')
  async update(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    const schedule = await this.service.update(ctx, id, dto);
    return ApiResponse.ok(schedule);
  }

  @Post(':id/activate')
  @RequirePermissions('checklist.schedule.activate')
  async activate(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
  ) {
    const schedule = await this.service.activate(ctx, id);
    return ApiResponse.ok(schedule);
  }

  @Post(':id/deactivate')
  @RequirePermissions('checklist.schedule.deactivate')
  async deactivate(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
  ) {
    const schedule = await this.service.deactivate(ctx, id);
    return ApiResponse.ok(schedule);
  }
}
