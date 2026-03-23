import {
  Controller,
  Get,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { NotificationsService } from '../services/notifications.service';
import { NotificationPreferencesService } from '../services/notification-preferences.service';
import { ListNotificationsQueryDto } from '../dto/list-notifications-query.dto';
import { PutPreferencesDto } from '../dto/put-preferences.dto';
import { JwtAuthGuard } from '../../auth/guards/auth.guard';
import { RbacGuard } from '../../access/rbac/rbac.guard';
import { RequirePermissions } from '../../access/rbac/permissions.decorator';
import { ApiResponse } from '../../infra/responses/api-response';
import {
  CurrentTenantContext,
  TenantContext,
} from '../../access/decorators/current-tenant.decorator';

@Controller({ path: 'notifications', version: '1' })
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiTags('Notifications')
@ApiBearerAuth()
export class NotificationsController {
  constructor(
    private readonly service: NotificationsService,
    private readonly preferencesService: NotificationPreferencesService,
  ) {}

  @Get('preferences')
  @RequirePermissions('alert.view')
  @ApiOperation({
    summary: 'Get notification preferences',
    description: 'Returns effective notification preferences for all supported types. Uses defaults where no preference row exists.',
  })
  async getPreferences(@CurrentTenantContext() ctx: TenantContext) {
    const result = await this.preferencesService.getPreferences(ctx);
    return ApiResponse.ok(result);
  }

  @Put('preferences')
  @RequirePermissions('alert.view')
  @ApiOperation({
    summary: 'Update notification preferences',
    description: 'Upserts notification preferences for the current user. Only supported notification types and boolean values accepted.',
  })
  @ApiBody({ type: PutPreferencesDto })
  async putPreferences(
    @CurrentTenantContext() ctx: TenantContext,
    @Body() dto: PutPreferencesDto,
  ) {
    const result = await this.preferencesService.putPreferences(ctx, dto.items);
    return ApiResponse.ok(result);
  }

  @Get()
  @RequirePermissions('alert.view')
  @ApiOperation({
    summary: 'List notifications',
    description: 'Returns paginated notifications for the current user in the organization.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  async list(
    @CurrentTenantContext() ctx: TenantContext,
    @Query() query: ListNotificationsQueryDto,
  ) {
    const result = await this.service.list(ctx, {
      page: query.page,
      limit: query.limit,
      unreadOnly: query.unreadOnly,
    });
    return ApiResponse.ok(result);
  }

  @Get('unread-count')
  @RequirePermissions('alert.view')
  @ApiOperation({
    summary: 'Unread count',
    description: 'Returns the number of unread notifications for the current user.',
  })
  async getUnreadCount(@CurrentTenantContext() ctx: TenantContext) {
    const count = await this.service.getUnreadCount(ctx);
    return ApiResponse.ok({ count });
  }

  @Patch('mark-all-read')
  @RequirePermissions('alert.view')
  @ApiOperation({
    summary: 'Mark all as read',
    description: 'Marks all notifications as read for the current user.',
  })
  async markAllRead(@CurrentTenantContext() ctx: TenantContext) {
    const result = await this.service.markAllRead(ctx);
    return ApiResponse.ok(result);
  }

  @Patch(':id/read')
  @RequirePermissions('alert.view')
  @ApiOperation({
    summary: 'Mark notification as read',
    description: 'Marks a single notification as read for the current user.',
  })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  async markRead(
    @CurrentTenantContext() ctx: TenantContext,
    @Param('id') id: string,
  ) {
    await this.service.markRead(ctx, id);
    return ApiResponse.ok({ ok: true });
  }
}
