import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class FilesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    organizationId: string;
    storageProvider: string;
    bucket: string;
    objectKey: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    checksum?: string | null;
    uploadedByUserId?: string | null;
  }) {
    return this.prisma.file.create({
      data: {
        organizationId: data.organizationId,
        storageProvider: data.storageProvider,
        bucket: data.bucket,
        objectKey: data.objectKey,
        fileName: data.fileName,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        checksum: data.checksum ?? null,
        uploadedByUserId: data.uploadedByUserId ?? null,
        uploadedAt: new Date(),
      },
    });
  }

  async findById(organizationId: string, id: string) {
    return this.prisma.file.findFirst({
      where: { id, organizationId },
    });
  }
}
