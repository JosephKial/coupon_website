import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../AuthService.js';
import { ConflictError, AuthenticationError } from '../../middleware/error.middleware.js';

// Mock dependencies
const mockPrisma = {
  user: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
};

const mockRedisClient = {
  setJson: vi.fn(),
  exists: vi.fn(),
  del: vi.fn(),
};

// Mock the repositories and services
vi.mock('../../repositories/user.repository.js', () => ({
  UserRepository: vi.fn(() => ({
    findByEmail: vi.fn(),
    create: vi.fn(),
    updateLastLogin: vi.fn(),
    findById: vi.fn(),
  })),
}));

vi.mock('../../repositories/audit.repository.js', () => ({
  AuditRepository: vi.fn(() => ({
    create: vi.fn(),
  })),
}));

vi.mock('../PasswordService.js', () => ({
  PasswordService: vi.fn(() => ({
    hashPassword: vi.fn(),
    verifyPassword: vi.fn(),
  })),
}));

vi.mock('../JWTService.js', () => ({
  JWTService: vi.fn(() => ({
    generateTokens: vi.fn(),
    verifyRefreshToken: vi.fn(),
    invalidateRefreshToken: vi.fn(),
  })),
}));

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: any;
  let mockAuditRepository: any;
  let mockPasswordService: any;
  let mockJWTService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    authService = new AuthService(mockPrisma as any);
    
    // Get the mocked instances
    mockUserRepository = (authService as any).userRepository;
    mockAuditRepository = (authService as any).auditRepository;
    mockPasswordService = (authService as any).passwordService;
    mockJWTService = (authService as any).jwtService;
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const mockUser = {
        id: 'user-123',
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: 'MEMBER',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock user doesn't exist
      mockUserRepository.findByEmail.mockResolvedValue(null);
      // Mock password hashing
      mockPasswordService.hashPassword.mockResolvedValue('hashed-password');
      // Mock user creation
      mockUserRepository.create.mockResolvedValue(mockUser);
      // Mock audit log creation
      mockAuditRepository.create.mockResolvedValue({});

      const result = await authService.register(userData, '127.0.0.1', 'test-agent');

      expect(result).toMatchObject({
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: 'MEMBER',
        isActive: true,
      });
      expect(result.id).toBeDefined();
      expect((result as any).passwordHash).toBeUndefined();

      // Verify method calls
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(userData.email);
      expect(mockPasswordService.hashPassword).toHaveBeenCalledWith(userData.password);
      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(mockAuditRepository.create).toHaveBeenCalled();
    });

    it('should throw ConflictError if user already exists', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const existingUser = {
        id: 'existing-user',
        email: userData.email,
      };

      // Mock user already exists
      mockUserRepository.findByEmail.mockResolvedValue(existingUser);

      await expect(authService.register(userData)).rejects.toThrow(ConflictError);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(userData.email);
      expect(mockPasswordService.hashPassword).not.toHaveBeenCalled();
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
      };

      const mockUser = {
        id: 'user-123',
        email: loginData.email,
        firstName: 'John',
        lastName: 'Doe',
        role: 'MEMBER',
        isActive: true,
        passwordHash: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      // Mock user exists and is active
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      // Mock password verification
      mockPasswordService.verifyPassword.mockResolvedValue(true);
      // Mock last login update
      mockUserRepository.updateLastLogin.mockResolvedValue(mockUser);
      // Mock token generation
      mockJWTService.generateTokens.mockResolvedValue(mockTokens);
      // Mock audit log creation
      mockAuditRepository.create.mockResolvedValue({});

      const result = await authService.login(loginData, '127.0.0.1', 'test-agent');

      expect(result.user).toMatchObject({
        email: loginData.email,
        firstName: 'John',
        lastName: 'Doe',
        role: 'MEMBER',
        isActive: true,
      });
      expect(result.tokens).toEqual(mockTokens);

      // Verify method calls
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(loginData.email);
      expect(mockPasswordService.verifyPassword).toHaveBeenCalledWith(
        loginData.password,
        mockUser.passwordHash
      );
      expect(mockUserRepository.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
      expect(mockJWTService.generateTokens).toHaveBeenCalled();
      expect(mockAuditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOGIN_SUCCESS',
          userId: mockUser.id,
        })
      );
    });

    it('should throw AuthenticationError if user not found', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'TestPassword123!',
      };

      // Mock user doesn't exist
      mockUserRepository.findByEmail.mockResolvedValue(null);
      // Mock audit log creation
      mockAuditRepository.create.mockResolvedValue({});

      await expect(authService.login(loginData)).rejects.toThrow(AuthenticationError);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(loginData.email);
      expect(mockPasswordService.verifyPassword).not.toHaveBeenCalled();
      expect(mockAuditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOGIN_FAILED',
          details: expect.objectContaining({
            reason: 'User not found',
          }),
        })
      );
    });

    it('should throw AuthenticationError if password is invalid', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword123!',
      };

      const mockUser = {
        id: 'user-123',
        email: loginData.email,
        isActive: true,
        passwordHash: 'hashed-password',
      };

      // Mock user exists
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      // Mock password verification fails
      mockPasswordService.verifyPassword.mockResolvedValue(false);
      // Mock audit log creation
      mockAuditRepository.create.mockResolvedValue({});

      await expect(authService.login(loginData)).rejects.toThrow(AuthenticationError);
      expect(mockPasswordService.verifyPassword).toHaveBeenCalledWith(
        loginData.password,
        mockUser.passwordHash
      );
      expect(mockAuditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOGIN_FAILED',
          details: expect.objectContaining({
            reason: 'Invalid password',
          }),
        })
      );
    });

    it('should throw AuthenticationError if user is inactive', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'TestPassword123!',
      };

      const mockUser = {
        id: 'user-123',
        email: loginData.email,
        isActive: false,
        passwordHash: 'hashed-password',
      };

      // Mock user exists but is inactive
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      // Mock audit log creation
      mockAuditRepository.create.mockResolvedValue({});

      await expect(authService.login(loginData)).rejects.toThrow(AuthenticationError);
      expect(mockPasswordService.verifyPassword).not.toHaveBeenCalled();
      expect(mockAuditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOGIN_FAILED',
          details: expect.objectContaining({
            reason: 'Account inactive',
          }),
        })
      );
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const userId = 'user-123';
      const refreshToken = 'refresh-token';

      // Mock token invalidation
      mockJWTService.invalidateRefreshToken.mockResolvedValue(undefined);
      // Mock audit log creation
      mockAuditRepository.create.mockResolvedValue({});

      await authService.logout(userId, refreshToken, '127.0.0.1', 'test-agent');

      expect(mockJWTService.invalidateRefreshToken).toHaveBeenCalledWith(refreshToken);
      expect(mockAuditRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOGOUT',
          userId,
        })
      );
    });
  });

  describe('getProfile', () => {
    it('should return user profile successfully', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'MEMBER',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock user exists
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await authService.getProfile(userId);

      expect(result).toMatchObject({
        id: userId,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'MEMBER',
        isActive: true,
      });
      expect((result as any).passwordHash).toBeUndefined();
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
    });

    it('should throw AuthenticationError if user not found', async () => {
      const userId = 'nonexistent-user';

      // Mock user doesn't exist
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(authService.getProfile(userId)).rejects.toThrow(AuthenticationError);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
    });
  });
});