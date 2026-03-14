import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { ChecklistRunsService } from '../services/checklist-runs.service';
import { UpdateRunItemDto } from '../dto/update-run-item.dto';
import { LinkAttachmentToRunItemDto } from '../dto/link-attachment-to-run-item.dto';
import { CreateTemperatureReadingForRunItemDto } from '../dto/create-temperature-reading-for-run-item.dto';
import { JwtAuthGuard } from '../../../auth/guards/auth.guard';
import { RbacGuard } from '../../../access/rbac/rbac.guard';
import { RequirePermissions } from '../../../access/rbac/permissions.decorator';
import { ApiResponse } from '../../../infra/responses/api-response';
import {
  CurrentTenantContext,
  TenantContext,
} from '../../../access/decorators/current-tenant.decorator';

@Controller({ path: 'checklist-run-items', version: '1' })
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiTags('Checklist Run Items')
@ApiBearerAuth()
export class ChecklistRunItemsController {
  constructor(private readonly service: ChecklistRunsService) {}

  @Patch(':id')
  @RequirePermissions('checklist.run.update')
  @ApiOperation({ summary: 'Update run item response' })
  @ApiParam({ name: 'id', description: 'Run item snapshot UUID' })
  @ApiBody({ type: UpdateRunItemDto })
  async update(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateRunItemDto,
  ) {
    const item = await this.service.updateRunItem(ctx, id, dto);
    return ApiResponse.ok(item);
  }

  @Post(':id/attachments')
  @RequirePermissions('checklist.run.update')
  @ApiOperation({ summary: 'Link attachment as evidence to run item' })
  @ApiParam({ name: 'id', description: 'Run item snapshot UUID' })
  @ApiBody({ type: LinkAttachmentToRunItemDto })
  async linkAttachment(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
    @Body() dto: LinkAttachmentToRunItemDto,
  ) {
    const attachment = await this.service.linkAttachmentToRunItem(ctx, id, dto);
    return ApiResponse.ok(attachment);
  }

  @Post(':id/temperature-readings')
  @RequirePermissions('checklist.run.update')
  @ApiOperation({ summary: 'Create temperature reading for run item snapshot' })
  @ApiParam({ name: 'id', description: 'Run item snapshot UUID (ChecklistRunItemSnapshot.id)' })
  @ApiBody({ type: CreateTemperatureReadingForRunItemDto })
  async createTemperatureReading(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
    @Body() dto: CreateTemperatureReadingForRunItemDto,
  ) {
    const reading = await this.service.createTemperatureReadingForRunItem(ctx, id, dto);
    return ApiResponse.created(reading);
  }
}
