import { PrismaClient, User, UserRole } from '@prisma/client';
import { CreateUserData, UpdateUserData } from '../types/user.types.js';

export class UserRepository {
  constructor(private prisma: PrismaClient) {}

  async create(userData: CreateUserData): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: userData.email,
        passwordHash: userData.password, // This will be hashed before calling this method
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role || UserRole.MEMBER,
      },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async update(id: string, userData: UpdateUserData): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: userData,
    });
  }

  async updateLastLogin(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        lastLoginAt: new Date(),
      },
    });
  }

  async delete(id: string): Promise<User> {
    return this.prisma.user.delete({
      where: { id },
    });
  }

  async exists(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    return !!user;
  }

  async count(): Promise<number> {
    return this.prisma.user.count();
  }
}