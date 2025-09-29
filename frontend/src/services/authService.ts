import { User, AuthTokens, LoginCredentials, RegisterData, ApiResponse } from '../types';
import { apiClient } from './apiClient';

class AuthService {
  getStoredTokens(): AuthTokens | null {
    return apiClient.getTokens();
  }

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/auth/profile');
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error?.message || 'Failed to get current user');
  }

  async login(credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }> {
    const response = await apiClient.post<{ user: User; tokens: AuthTokens }>('/auth/login', credentials);
    
    if (response.success && response.data) {
      const { user, tokens } = response.data;
      apiClient.setTokens(tokens);
      return { user, tokens };
    }
    
    throw new Error(response.error?.message || 'Login failed');
  }

  async register(data: RegisterData): Promise<{ user: User; tokens: AuthTokens }> {
    const response = await apiClient.post<{ user: User; tokens: AuthTokens }>('/auth/register', data);
    
    if (response.success && response.data) {
      const { user, tokens } = response.data;
      apiClient.setTokens(tokens);
      return { user, tokens };
    }
    
    throw new Error(response.error?.message || 'Registration failed');
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout API call failed:', error);
    } finally {
      apiClient.clearAuth();
    }
  }

  async refreshToken(): Promise<AuthTokens> {
    const tokens = this.getStoredTokens();
    if (!tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await apiClient.post<AuthTokens>('/auth/refresh', {
      refreshToken: tokens.refreshToken,
    });
    
    if (response.success && response.data) {
      apiClient.setTokens(response.data);
      return response.data;
    }
    
    throw new Error(response.error?.message || 'Token refresh failed');
  }

  isAuthenticated(): boolean {
    const tokens = this.getStoredTokens();
    return !!tokens?.accessToken;
  }

  isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch {
      return true;
    }
  }
}

export const authService = new AuthService();