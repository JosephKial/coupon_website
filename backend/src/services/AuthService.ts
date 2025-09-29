import { PrismaClient } from '@prisma/client';
import { UserRepository } from '../repositories/user.repository.js';
import { AuditRepository } from '../repositories/audit.repository.js';
import { PasswordService } from './PasswordService.js';
import { JWTService } from './JWTService.js';
import { CreateUserInput, LoginInput, UserResponse } from '../types/user.types.js';
import { ConflictError, AuthenticationError, ValidationError } from '../middleware/error.middleware.js';
import { logger } from '../utils/logger.js';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResult {
  user: UserResponse;
  tokens: AuthTokens;
}

export class AuthService {
  private userRepository: UserRepository;
  private auditRepository: AuditRepository;
  private passwordService: PasswordService;
  private jwtService: JWTService;

  constructor(prisma: PrismaClient) {
    this.userRepository = new UserRepository(prisma);
    this.auditRepository = new AuditRepository(prisma);
    this.passwordService = new PasswordService();
    this.jwtService = new JWTService();
  }

  async register(userData: CreateUserInput, ipAddress?: string, userAgent?: string): Promise<UserResponse> {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await PasswordService.hash(userData.password);

    // Create user
    const user = await this.userRepository.create({
      ...userData,
      password: hashedPassword,
    });

    // Log registration event
    await this.auditRepository.create({
      userId: user.id,
      action: 'USER_REGISTERED',
      resourceType: 'USER',
      resourceId: user.id,
      details: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      ipAddress,
      userAgent,
    });

    logger.info('User registered successfully', {
      userId: user.id,
      email: user.email,
      ipAddress,
    });

    // Return user without sensitive data
    return this.toUserResponse(user);
  }

  async login(loginData: LoginInput, ipAddress?: string, userAgent?: string): Promise<LoginResult> {
    // Find user by email
    const user = await this.userRepository.findByEmail(loginData.email);
    if (!user) {
      await this.auditRepository.create({
        action: 'LOGIN_FAILED',
        resourceType: 'USER',
        details: {
          email: loginData.email,
          reason: 'User not found',
        },
        ipAddress,
        userAgent,
      });
      throw new AuthenticationError('Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      await this.auditRepository.create({
        userId: user.id,
        action: 'LOGIN_FAILED',
        resourceType: 'USER',
        resourceId: user.id,
        details: {
          email: user.email,
          reason: 'Account inactive',
        },
        ipAddress,
        userAgent,
      });
      throw new AuthenticationError('Account is inactive');
    }

    // Verify password
    const isPasswordValid = await PasswordService.verify(
      user.passwordHash,
      loginData.password
    );

    if (!isPasswordValid) {
      await this.auditRepository.create({
        userId: user.id,
        action: 'LOGIN_FAILED',
        resourceType: 'USER',
        resourceId: user.id,
        details: {
          email: user.email,
          reason: 'Invalid password',
        },
        ipAddress,
        userAgent,
      });
      throw new AuthenticationError('Invalid email or password');
    }

    // Update last login time
    await this.userRepository.updateLastLogin(user.id);

    // Generate tokens
    const tokens = await this.jwtService.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Log successful login
    await this.auditRepository.create({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      resourceType: 'USER',
      resourceId: user.id,
      details: {
        email: user.email,
      },
      ipAddress,
      userAgent,
    });

    logger.info('User logged in successfully', {
      userId: user.id,
      email: user.email,
      ipAddress,
    });

    return {
      user: this.toUserResponse(user),
      tokens,
    };
  }

  async logout(userId: string, refreshToken: string, ipAddress?: string, userAgent?: string): Promise<void> {
    // Invalidate refresh token
    await this.jwtService.invalidateRefreshToken(refreshToken);

    // Log logout event
    await this.auditRepository.create({
      userId,
      action: 'LOGOUT',
      resourceType: 'USER',
      resourceId: userId,
      ipAddress,
      userAgent,
    });

    logger.info('User logged out successfully', {
      userId,
      ipAddress,
    });
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    // Verify and decode refresh token
    const payload = await this.jwtService.verifyRefreshToken(refreshToken);
    
    // Get user to ensure they still exist and are active
    const user = await this.userRepository.findById(payload.userId);
    if (!user || !user.isActive) {
      throw new AuthenticationError('Invalid refresh token');
    }

    // Generate new tokens
    const tokens = await this.jwtService.generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Invalidate old refresh token
    await this.jwtService.invalidateRefreshToken(refreshToken);

    return tokens;
  }

  async getProfile(userId: string): Promise<UserResponse> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    return this.toUserResponse(user);
  }

  private toUserResponse(user: any): UserResponse {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
    };
  }
}