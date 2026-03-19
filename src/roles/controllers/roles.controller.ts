import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RolesService } from '../services/roles.service';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { RbacGuard } from '../../access/rbac/rbac.guard';
import { RequirePermissions } from '../../access/rbac/permissions.decorator';
import { ApiResponse } from '../../infra/responses/api-response';
import {
  CurrentTenantContext,
  TenantContext,
} from '../../access/decorators/current-tenant.decorator';

@Controller({ path: 'roles', version: '1' })
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiTags('Roles')
@ApiBearerAuth()
export class RolesController {
  constructor(private readonly service: RolesService) {}

  @Get()
  @RequirePermissions('user.view')
  @ApiOperation({
    summary: 'List roles',
    description:
      'Returns organization-scoped roles with their permissions. Used for user invite and role visibility.',
  })
  async list(@CurrentTenantContext() ctx: TenantContext) {
    const data = await this.service.list(ctx);
    return ApiResponse.ok(data);
  }
}
