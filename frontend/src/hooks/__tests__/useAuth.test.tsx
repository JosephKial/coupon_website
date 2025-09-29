import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '../useAuth';
import { AuthProvider } from '../../contexts/AuthContext';
import { ReactNode } from 'react';

// Mock the auth service
vi.mock('../../services/authService', () => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  refreshToken: vi.fn(),
  getCurrentUser: vi.fn(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should return initial auth state', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(true);
  });

  it('should handle login success', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'MEMBER' as const,
    };

    const mockAuthService = await import('../../services/authService');
    (mockAuthService.login as any).mockResolvedValue({
      user: mockUser,
      accessToken: 'mock-token',
      refreshToken: 'mock-refresh-token',
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });

    expect(mockAuthService.login).toHaveBeenCalledWith('test@example.com', 'password');
  });

  it('should handle login failure', async () => {
    const mockAuthService = await import('../../services/authService');
    (mockAuthService.login as any).mockRejectedValue(new Error('Invalid credentials'));

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.login('test@example.com', 'wrong-password');
      })
    ).rejects.toThrow('Invalid credentials');
  });

  it('should handle logout', async () => {
    const mockAuthService = await import('../../services/authService');
    (mockAuthService.logout as any).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(mockAuthService.logout).toHaveBeenCalled();
  });

  it('should handle register', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'MEMBER' as const,
    };

    const mockAuthService = await import('../../services/authService');
    (mockAuthService.register as any).mockResolvedValue({
      user: mockUser,
      accessToken: 'mock-token',
      refreshToken: 'mock-refresh-token',
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    const registerData = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
    };

    await act(async () => {
      await result.current.register(registerData);
    });

    expect(mockAuthService.register).toHaveBeenCalledWith(registerData);
  });

  it('should handle token refresh', async () => {
    const mockAuthService = await import('../../services/authService');
    (mockAuthService.refreshToken as any).mockResolvedValue({
      accessToken: 'new-token',
      refreshToken: 'new-refresh-token',
    });

    // Set up initial refresh token
    localStorage.setItem('refreshToken', 'old-refresh-token');

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.refreshToken();
    });

    expect(mockAuthService.refreshToken).toHaveBeenCalledWith('old-refresh-token');
  });

  it('should handle token refresh failure', async () => {
    const mockAuthService = await import('../../services/authService');
    (mockAuthService.refreshToken as any).mockRejectedValue(new Error('Token expired'));

    localStorage.setItem('refreshToken', 'expired-token');

    const { result } = renderHook(() => useAuth(), {
      wrapper: createWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.refreshToken();
      })
    ).rejects.toThrow('Token expired');
  });
});