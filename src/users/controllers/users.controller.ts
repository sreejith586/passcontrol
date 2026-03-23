import { Controller, Get, Post, Patch, Delete, Query, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiBody, ApiParam } from '@nestjs/swagger';
import { UsersService } from '../services/users.service';
import { ListUsersQueryDto } from '../dto/list-users-query.dto';
import { InviteUserDto } from '../dto/invite-user.dto';
import { AddRoleDto } from '../dto/add-role.dto';
import { UpdateUserStatusDto } from '../dto/update-user-status.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';
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

  @Post(':id/reinvite')
  @RequirePermissions('user.invite')
  @ApiOperation({
    summary: 'Re-invite user',
    description:
      'Re-sends invitation email to a user who has not set a password. User must be deactivated. Invalidates prior setup tokens.',
  })
  @ApiParam({ name: 'id', description: 'User UUID' })
  async reinvite(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
  ) {
    const data = await this.service.reinvite(ctx, id);
    return ApiResponse.ok(data);
  }

  @Get('me')
  @RequireAnyPermission('user.view', 'alert.workflow-policy.view')
  @ApiOperation({ summary: 'Get my profile', description: 'Returns the current user profile for the organization' })
  async getMe(@CurrentTenantContext() ctx: TenantContext) {
    const data = await this.service.getMe(ctx);
    return ApiResponse.ok(data);
  }

  @Patch('me')
  @RequireAnyPermission('user.view', 'alert.workflow-policy.view')
  @ApiOperation({ summary: 'Update my profile', description: 'Updates name, phoneNumber, jobTitle for the current user' })
  @ApiBody({ type: UpdateProfileDto })
  async updateProfile(
    @CurrentTenantContext() ctx: TenantContext,
    @Body() dto: UpdateProfileDto,
  ) {
    const data = await this.service.updateProfile(ctx, dto);
    return ApiResponse.ok(data);
  }

  @Post(':id/roles')
  @RequirePermissions('user.manage')
  @ApiOperation({
    summary: 'Add role to user',
    description:
      'Adds a role to an existing user in the organization. Idempotent if user already has the role.',
  })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiBody({ type: AddRoleDto })
  async addRole(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
    @Body() dto: AddRoleDto,
  ) {
    const data = await this.service.addRole(ctx, id, dto);
    return ApiResponse.ok(data);
  }

  @Delete(':id/roles/:roleId')
  @RequirePermissions('user.manage')
  @ApiOperation({
    summary: 'Remove role from user',
    description:
      'Removes a role assignment from the user in the current organization. Idempotent if assignment does not exist.',
  })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiParam({ name: 'roleId', description: 'Role UUID to remove' })
  async removeRole(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
    @Param('roleId') roleId: string,
  ) {
    const data = await this.service.removeRole(ctx, id, roleId);
    return ApiResponse.ok(data);
  }

  @Patch(':id/status')
  @RequirePermissions('user.manage')
  @ApiOperation({
    summary: 'Update user status',
    description: 'Activates or deactivates a user. Inactive users cannot log in.',
  })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiBody({ type: UpdateUserStatusDto })
  async updateStatus(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    const data = await this.service.updateStatus(ctx, id, dto);
    return ApiResponse.ok(data);
  }
}
