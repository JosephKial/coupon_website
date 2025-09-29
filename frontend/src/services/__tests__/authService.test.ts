import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from '../authService';
import { apiClient } from '../apiClient';

// Mock the API client
vi.mock('../apiClient');
const mockedApiClient = vi.mocked(apiClient);

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('login', () => {
    it('should login successfully and store tokens', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            user: {
              id: '1',
              email: 'test@example.com',
              firstName: 'Test',
              lastName: 'User',
              role: 'MEMBER',
            },
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
          },
        },
      };

      mockedApiClient.post.mockResolvedValue(mockResponse);

      const result = await authService.login('test@example.com', 'password');

      expect(mockedApiClient.post).toHaveBeenCalledWith('/auth/login', {
        email: 'test@example.com',
        password: 'password',
      });

      expect(result).toEqual(mockResponse.data.data);
      expect(localStorage.getItem('accessToken')).toBe('access-token');
      expect(localStorage.getItem('refreshToken')).toBe('refresh-token');
    });

    it('should handle login failure', async () => {
      const mockError = {
        response: {
          data: {
            success: false,
            error: {
              message: 'Invalid credentials',
            },
          },
        },
      };

      mockedApiClient.post.mockRejectedValue(mockError);

      await expect(
        authService.login('test@example.com', 'wrong-password')
      ).rejects.toThrow('Invalid credentials');

      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });
  });

  describe('register', () => {
    it('should register successfully and store tokens', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            user: {
              id: '1',
              email: 'test@example.com',
              firstName: 'Test',
              lastName: 'User',
              role: 'MEMBER',
            },
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
          },
        },
      };

      mockedApiClient.post.mockResolvedValue(mockResponse);

      const registerData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const result = await authService.register(registerData);

      expect(mockedApiClient.post).toHaveBeenCalledWith('/auth/register', registerData);
      expect(result).toEqual(mockResponse.data.data);
      expect(localStorage.getItem('accessToken')).toBe('access-token');
      expect(localStorage.getItem('refreshToken')).toBe('refresh-token');
    });

    it('should handle registration failure', async () => {
      const mockError = {
        response: {
          data: {
            success: false,
            error: {
              message: 'Email already exists',
            },
          },
        },
      };

      mockedApiClient.post.mockRejectedValue(mockError);

      const registerData = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      await expect(authService.register(registerData)).rejects.toThrow('Email already exists');
    });
  });

  describe('logout', () => {
    it('should logout successfully and clear tokens', async () => {
      localStorage.setItem('accessToken', 'access-token');
      localStorage.setItem('refreshToken', 'refresh-token');

      mockedApiClient.post.mockResolvedValue({ data: { success: true } });

      await authService.logout();

      expect(mockedApiClient.post).toHaveBeenCalledWith('/auth/logout');
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });

    it('should clear tokens even if logout request fails', async () => {
      localStorage.setItem('accessToken', 'access-token');
      localStorage.setItem('refreshToken', 'refresh-token');

      mockedApiClient.post.mockRejectedValue(new Error('Network error'));

      await authService.logout();

      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            accessToken: 'new-access-token',
            refreshToken: 'new-refresh-token',
          },
        },
      };

      mockedApiClient.post.mockResolvedValue(mockResponse);

      const result = await authService.refreshToken('old-refresh-token');

      expect(mockedApiClient.post).toHaveBeenCalledWith('/auth/refresh', {
        refreshToken: 'old-refresh-token',
      });

      expect(result).toEqual(mockResponse.data.data);
      expect(localStorage.getItem('accessToken')).toBe('new-access-token');
      expect(localStorage.getItem('refreshToken')).toBe('new-refresh-token');
    });

    it('should handle refresh token failure', async () => {
      const mockError = {
        response: {
          data: {
            success: false,
            error: {
              message: 'Refresh token expired',
            },
          },
        },
      };

      mockedApiClient.post.mockRejectedValue(mockError);

      await expect(
        authService.refreshToken('expired-token')
      ).rejects.toThrow('Refresh token expired');
    });
  });

  describe('getCurrentUser', () => {
    it('should get current user successfully', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: {
            id: '1',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            role: 'MEMBER',
          },
        },
      };

      mockedApiClient.get.mockResolvedValue(mockResponse);

      const result = await authService.getCurrentUser();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/auth/profile');
      expect(result).toEqual(mockResponse.data.data);
    });

    it('should handle get current user failure', async () => {
      const mockError = {
        response: {
          data: {
            success: false,
            error: {
              message: 'Unauthorized',
            },
          },
        },
      };

      mockedApiClient.get.mockRejectedValue(mockError);

      await expect(authService.getCurrentUser()).rejects.toThrow('Unauthorized');
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when access token exists', () => {
      localStorage.setItem('accessToken', 'test-token');
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should return false when access token does not exist', () => {
      localStorage.removeItem('accessToken');
      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('getAccessToken', () => {
    it('should return access token when it exists', () => {
      localStorage.setItem('accessToken', 'test-token');
      expect(authService.getAccessToken()).toBe('test-token');
    });

    it('should return null when access token does not exist', () => {
      localStorage.removeItem('accessToken');
      expect(authService.getAccessToken()).toBeNull();
    });
  });

  describe('getRefreshToken', () => {
    it('should return refresh token when it exists', () => {
      localStorage.setItem('refreshToken', 'test-refresh-token');
      expect(authService.getRefreshToken()).toBe('test-refresh-token');
    });

    it('should return null when refresh token does not exist', () => {
      localStorage.removeItem('refreshToken');
      expect(authService.getRefreshToken()).toBeNull();
    });
  });
});