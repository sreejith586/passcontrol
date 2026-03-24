import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { RolesRepository } from '../repositories/roles.repository';
import { ROLE_SCOPE_PLATFORM } from '../role-scope.constants';

@Injectable()
export class RolesService {
  constructor(private readonly repo: RolesRepository) {}

  async list(ctx: { organizationId: string }) {
    const roles = await this.repo.listAssignableInOrg(ctx.organizationId);
    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      key: r.key,
      scope: r.scope,
      permissions: r.permissions.map((rp) => rp.permission.key),
    }));
  }

  /**
   * Enforce tenant invite / add-role: platform roles are forbidden; invalid org roles are 400.
   */
  async assertTenantMayAssignRole(
    roleId: string,
    organizationId: string,
  ): Promise<void> {
    const role = await this.repo.findById(roleId);
    if (!role) {
      throw new BadRequestException('Invalid role');
    }
    if (role.scope === ROLE_SCOPE_PLATFORM) {
      throw new ForbiddenException(
        'Platform roles cannot be assigned from an organization',
      );
    }
    const assignable = await this.repo.findAssignableInOrg(
      roleId,
      organizationId,
    );
    if (!assignable) {
      throw new BadRequestException('Invalid role for this organization');
    }
  }

  /**
   * Tenant APIs must not remove platform role assignments (e.g. super_admin) from org members.
   */
  async assertTenantMayRemoveRoleAssignment(roleId: string): Promise<void> {
    const role = await this.repo.findById(roleId);
    if (!role) {
      throw new BadRequestException('Invalid role');
    }
    if (role.scope === ROLE_SCOPE_PLATFORM) {
      throw new ForbiddenException(
        'Platform role assignments cannot be removed from an organization',
      );
    }
  }

  async isRoleAssignableInOrg(
    roleId: string,
    organizationId: string,
  ): Promise<boolean> {
    const role = await this.repo.findAssignableInOrg(roleId, organizationId);
    return !!role;
  }
}
