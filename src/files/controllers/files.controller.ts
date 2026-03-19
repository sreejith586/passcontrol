import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { FilesService } from '../services/files.service';
import { InitUploadDto } from '../dto/init-upload.dto';
import { RegisterFileDto } from '../dto/register-file.dto';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { RbacGuard } from '../../access/rbac/rbac.guard';
import { RequirePermissions } from '../../access/rbac/permissions.decorator';
import { ApiResponse } from '../../infra/responses/api-response';
import {
  CurrentTenantContext,
  TenantContext,
} from '../../access/decorators/current-tenant.decorator';

@Controller({ path: 'files', version: '1' })
@UseGuards(JwtAuthGuard, RbacGuard)
export class FilesController {
  constructor(private readonly service: FilesService) {}

  @Get(':id/content')
  @RequirePermissions('file.view')
  async getContent(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
    @Res({ passthrough: false }) res: Response,
  ) {
    const { buffer, mimeType, fileName } = await this.service.getContent(
      ctx,
      id,
    );
    const safeName = fileName?.replace(/[^\w.-]/g, '_') ?? 'file';
    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${safeName}"`,
    );
    res.send(buffer);
  }

  @Post('init-upload')
  @RequirePermissions('file.upload')
  async initUpload(
    @CurrentTenantContext() ctx: TenantContext,
    @Body() dto: InitUploadDto,
  ) {
    const result = await this.service.initUpload(ctx, dto);
    return ApiResponse.ok(result);
  }

  @Post()
  @RequirePermissions('file.upload')
  async registerFile(
    @CurrentTenantContext() ctx: TenantContext,
    @Body() dto: RegisterFileDto,
  ) {
    const file = await this.service.registerFile(ctx, dto);
    return ApiResponse.created(file);
  }

  @Get(':id')
  @RequirePermissions('file.view')
  async get(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
  ) {
    const file = await this.service.getById(ctx, id);
    return ApiResponse.ok(file);
  }
}
