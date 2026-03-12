import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AttachmentsService } from '../services/attachments.service';
import { CreateAttachmentDto } from '../dto/create-attachment.dto';
import { ListAttachmentsQueryDto } from '../dto/list-attachments.dto';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { RbacGuard } from '../../access/rbac/rbac.guard';
import { RequirePermissions } from '../../access/rbac/permissions.decorator';
import { ApiResponse } from '../../infra/responses/api-response';
import { CurrentTenantContext } from '../../access/decorators/current-tenant.decorator';

@Controller({ path: 'attachments', version: '1' })
@UseGuards(AuthGuard, RbacGuard)
export class AttachmentsController {
  constructor(private readonly service: AttachmentsService) {}

  @Post()
  @RequirePermissions('attachment.create')
  async create(
    @CurrentTenantContext() ctx: { organizationId: string; userId?: string },
    @Body() dto: CreateAttachmentDto,
  ) {
    const attachment = await this.service.create(ctx, dto);
    return ApiResponse.created(attachment);
  }

  @Get()
  @RequirePermissions('attachment.view')
  async list(
    @CurrentTenantContext() ctx: { organizationId: string },
    @Query() query: ListAttachmentsQueryDto,
  ) {
    const list = await this.service.list(ctx, query);
    return ApiResponse.ok(list);
  }

  @Get(':id')
  @RequirePermissions('attachment.view')
  async get(
    @CurrentTenantContext() ctx: { organizationId: string },
    @Param('id') id: string,
  ) {
    const attachment = await this.service.getById(ctx, id);
    return ApiResponse.ok(attachment);
  }

  @Delete(':id')
  @RequirePermissions('attachment.delete')
  async delete(
    @CurrentTenantContext() ctx: { organizationId: string; userId?: string },
    @Param('id') id: string,
  ) {
    const result = await this.service.delete(ctx, id);
    return ApiResponse.ok(result);
  }
}
