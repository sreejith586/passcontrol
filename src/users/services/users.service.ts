import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../repositories/users.repository';
import { ListUsersQueryDto } from '../dto/list-users-query.dto';

@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  async list(ctx: { organizationId: string }, query: ListUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 25, 100);
    const { items, total } = await this.repo.listByOrganization(
      ctx.organizationId,
      { page, limit },
    );
    return { items, total, page, limit };
  }

  async belongsToOrganization(
    userId: string,
    organizationId: string,
  ): Promise<boolean> {
    return this.repo.belongsToOrganization(userId, organizationId);
  }
}
