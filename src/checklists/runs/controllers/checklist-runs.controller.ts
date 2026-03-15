import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ChecklistRunsService } from '../services/checklist-runs.service';
import { ListTodayRunsQueryDto } from '../dto/list-today-runs.dto';
import { JwtAuthGuard } from '../../../auth/guards/auth.guard';
import { RbacGuard } from '../../../access/rbac/rbac.guard';
import { RequirePermissions } from '../../../access/rbac/permissions.decorator';
import { ApiResponse } from '../../../infra/responses/api-response';
import {
  CurrentTenantContext,
  TenantContext,
} from '../../../access/decorators/current-tenant.decorator';

@Controller({ path: 'checklist-runs', version: '1' })
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiTags('Checklist Runs')
@ApiBearerAuth()
export class ChecklistRunsController {
  constructor(private readonly service: ChecklistRunsService) {}

  @Get('today')
  @RequirePermissions('checklist.run.view')
  @ApiOperation({ summary: 'List runs for today (paginated)' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'] })
  @ApiQuery({ name: 'brandId', required: false, description: 'Filter by brand UUID' })
  @ApiQuery({ name: 'locationId', required: false, description: 'Filter by location UUID' })
  @ApiQuery({ name: 'zoneId', required: false, description: 'Filter by zone UUID' })
  @ApiQuery({ name: 'timezone', required: false, example: 'America/New_York' })
  @ApiQuery({ name: 'date', required: false, example: '2025-03-14' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 25 })
  @ApiQuery({
    name: 'view',
    required: false,
    enum: ['full', 'summary'],
    description:
      'View mode: "full" (default) includes sectionSnapshots and itemSnapshots; "summary" returns run-level fields only for lighter payloads',
  })
  async getToday(
    @CurrentTenantContext() ctx: TenantContext,
    @Query() query: ListTodayRunsQueryDto,
  ) {
    const list = await this.service.getTodayRuns(ctx, query);
    return ApiResponse.ok(list);
  }

  @Get(':id')
  @RequirePermissions('checklist.run.view')
  @ApiOperation({ summary: 'Get run by ID with sections and items' })
  @ApiParam({ name: 'id', description: 'Run UUID' })
  async getById(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
  ) {
    const run = await this.service.getRunById(ctx, id);
    return ApiResponse.ok(run);
  }

  @Post(':id/submit')
  @RequirePermissions('checklist.run.submit')
  @ApiOperation({ summary: 'Submit completed run' })
  @ApiParam({ name: 'id', description: 'Run UUID' })
  async submit(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
  ) {
    const run = await this.service.submitRun(ctx, id);
    return ApiResponse.ok(run);
  }
}
