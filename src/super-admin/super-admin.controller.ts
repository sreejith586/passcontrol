import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { ApiResponse } from '../infra/responses/api-response';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { SuperAdminService } from './super-admin.service';

@Controller({ path: 'super-admin', version: '1' })
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class SuperAdminController {
  constructor(private readonly superAdmin: SuperAdminService) {}

  @Get('tenants')
  async listTenants() {
    const data = await this.superAdmin.listTenants();
    return ApiResponse.ok(data);
  }
}
