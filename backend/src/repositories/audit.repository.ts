import { PrismaClient, AuditLog } from '@prisma/client';

export interface CreateAuditLogData {
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditRepository {
  constructor(private prisma: PrismaClient) {}

  async create(auditData: CreateAuditLogData): Promise<AuditLog> {
    return this.prisma.auditLog.create({
      data: auditData,
    });
  }

  async findByUserId(userId: string, limit: number = 50): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findByAction(action: string, limit: number = 50): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { action },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findByResourceType(resourceType: string, limit: number = 50): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: { resourceType },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}