import { Injectable } from '@nestjs/common';
import { RolesRepository } from '../repositories/roles.repository';

@Injectable()
export class RolesService {
  constructor(private readonly repo: RolesRepository) {}

  async list(ctx: { organizationId: string }) {
    const roles = await this.repo.listAssignableInOrg(ctx.organizationId);
    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      key: r.key,
      permissions: r.permissions.map((rp) => rp.permission.key),
    }));
  }

  async isRoleAssignableInOrg(
    roleId: string,
    organizationId: string,
  ): Promise<boolean> {
    const role = await this.repo.findAssignableInOrg(roleId, organizationId);
    return !!role;
  }
}
