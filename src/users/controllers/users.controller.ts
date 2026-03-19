import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UsersService } from '../services/users.service';
import { ListUsersQueryDto } from '../dto/list-users-query.dto';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { RbacGuard } from '../../access/rbac/rbac.guard';
import { RequirePermissions } from '../../access/rbac/permissions.decorator';
import { ApiResponse } from '../../infra/responses/api-response';
import {
  CurrentTenantContext,
  TenantContext,
} from '../../access/decorators/current-tenant.decorator';

@Controller({ path: 'users', version: '1' })
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiTags('Users')
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  @RequirePermissions('alert.assign')
  @ApiOperation({
    summary: 'List users for assignment',
    description:
      'Returns organization-scoped users (id, name, email) for alert assignment. Paginated.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async list(
    @CurrentTenantContext() ctx: TenantContext,
    @Query() query: ListUsersQueryDto,
  ) {
    const result = await this.service.list(ctx, query);
    return ApiResponse.ok(result);
  }
}
