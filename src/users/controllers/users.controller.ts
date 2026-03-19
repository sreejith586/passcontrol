import { Controller, Get, Post, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiBody } from '@nestjs/swagger';
import { UsersService } from '../services/users.service';
import { ListUsersQueryDto } from '../dto/list-users-query.dto';
import { InviteUserDto } from '../dto/invite-user.dto';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { RbacGuard } from '../../access/rbac/rbac.guard';
import { RequirePermissions, RequireAnyPermission } from '../../access/rbac/permissions.decorator';
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
  @RequireAnyPermission('user.view', 'alert.assign')
  @ApiOperation({
    summary: 'List users',
    description:
      'Returns organization-scoped users (id, name, email, roles) for assignment and user management. Paginated.',
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

  @Post('invite')
  @RequirePermissions('user.invite')
  @ApiOperation({
    summary: 'Invite user',
    description:
      'Invites a user by email. Creates user if not exists, assigns role in organization. Idempotent if user already has the role.',
  })
  @ApiBody({ type: InviteUserDto })
  async invite(
    @CurrentTenantContext() ctx: TenantContext,
    @Body() dto: InviteUserDto,
  ) {
    const data = await this.service.invite(ctx, dto);
    return ApiResponse.ok(data);
  }
}
