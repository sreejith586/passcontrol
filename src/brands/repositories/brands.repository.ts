import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class BrandsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(organizationId: string, id: string) {
    return this.prisma.brand.findFirst({
      where: { id, organizationId },
    });
  }

  async findMany(organizationId: string) {
    return this.prisma.brand.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
    });
  }

  async create(organizationId: string, data: { name: string }) {
    return this.prisma.brand.create({
      data: {
        organizationId,
        name: data.name.trim(),
      },
    });
  }

  async update(organizationId: string, id: string, data: { name?: string }) {
    await this.prisma.brand.updateMany({
      where: { id, organizationId },
      data: data.name !== undefined ? { name: data.name.trim() } : {},
    });
    return this.findById(organizationId, id);
  }

  /** Check if brand exists and belongs to organization (for scope validation). */
  async existsInOrg(organizationId: string, brandId: string): Promise<boolean> {
    const brand = await this.prisma.brand.findFirst({
      where: { id: brandId, organizationId },
      select: { id: true },
    });
    return !!brand;
  }
}
