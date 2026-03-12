import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { FilesService } from '../services/files.service';
import { InitUploadDto } from '../dto/init-upload.dto';
import { RegisterFileDto } from '../dto/register-file.dto';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { RbacGuard } from '../../access/rbac/rbac.guard';
import { RequirePermissions } from '../../access/rbac/permissions.decorator';
import { ApiResponse } from '../../infra/responses/api-response';
import { CurrentTenantContext } from '../../access/decorators/current-tenant.decorator';

@Controller({ path: 'files', version: '1' })
@UseGuards(AuthGuard, RbacGuard)
export class FilesController {
  constructor(private readonly service: FilesService) {}

  @Post('init-upload')
  @RequirePermissions('file.upload')
  async initUpload(
    @CurrentTenantContext() ctx: { organizationId: string; userId?: string },
    @Body() dto: InitUploadDto,
  ) {
    const result = await this.service.initUpload(ctx, dto);
    return ApiResponse.ok(result);
  }

  @Post()
  @RequirePermissions('file.upload')
  async registerFile(
    @CurrentTenantContext() ctx: { organizationId: string; userId?: string },
    @Body() dto: RegisterFileDto,
  ) {
    const file = await this.service.registerFile(ctx, dto);
    return ApiResponse.created(file);
  }

  @Get(':id')
  @RequirePermissions('file.view')
  async get(
    @CurrentTenantContext() ctx: { organizationId: string },
    @Param('id') id: string,
  ) {
    const file = await this.service.getById(ctx, id);
    return ApiResponse.ok(file);
  }
}
