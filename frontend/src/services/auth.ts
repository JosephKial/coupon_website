import axios, { AxiosResponse } from 'axios';
import { User, LoginRequest, RegisterRequest, AuthResponse } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Token management utilities
class TokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'access_token';
  private static readonly USER_KEY = 'user_data';
  
  static setAccessToken(token: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
  }
  
  static getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }
  
  static removeAccessToken(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
  }
  
  static setUserData(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }
  
  static getUserData(): User | null {
    const userData = localStorage.getItem(this.USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }
  
  static removeUserData(): void {
    localStorage.removeItem(this.USER_KEY);
  }
  
  static clearAll(): void {
    this.removeAccessToken();
    this.removeUserData();
  }
  
  static isAuthenticated(): boolean {
    const token = this.getAccessToken();
    return token !== null && token !== '';
  }
}

// Axios instance with interceptors
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = TokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      TokenManager.clearAll();
      // Redirect to login page
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Authentication service
class AuthService {
  static async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      // FastAPI expects form data for OAuth2
      const formData = new FormData();
      formData.append('username', credentials.email);
      formData.append('password', credentials.password);
      
      const response: AxiosResponse<AuthResponse> = await axios.post(
        `${API_BASE_URL}/auth/login`,
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      
      const authData = response.data;
      
      // Store token and user data
      TokenManager.setAccessToken(authData.access_token);
      TokenManager.setUserData(authData.user);
      
      return authData;
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(
        error.response?.data?.detail || 'Login failed. Please try again.'
      );
    }
  }
  
  static async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response: AxiosResponse<AuthResponse> = await axios.post(
        `${API_BASE_URL}/auth/register`,
        userData
      );
      
      const authData = response.data;
      
      // Store token and user data
      TokenManager.setAccessToken(authData.access_token);
      TokenManager.setUserData(authData.user);
      
      return authData;
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(
        error.response?.data?.detail || 'Registration failed. Please try again.'
      );
    }
  }
  
  static async logout(): Promise<void> {
    try {
      const token = TokenManager.getAccessToken();
      if (token) {
        await apiClient.post('/auth/logout');
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with local logout even if server logout fails
    } finally {
      TokenManager.clearAll();
    }
  }
  
  static async getCurrentUser(): Promise<User | null> {
    try {
      if (!TokenManager.isAuthenticated()) {
        return null;
      }
      
      const response: AxiosResponse<User> = await apiClient.get('/auth/me');
      const userData = response.data;
      
      // Update stored user data
      TokenManager.setUserData(userData);
      
      return userData;
    } catch (error) {
      console.error('Get current user error:', error);
      // If token is invalid, clear auth data
      TokenManager.clearAll();
      return null;
    }
  }
  
  static getCurrentUserFromStorage(): User | null {
    return TokenManager.getUserData();
  }
  
  static isAuthenticated(): boolean {
    return TokenManager.isAuthenticated();
  }
  
  static async refreshAuthState(): Promise<User | null> {
    if (!this.isAuthenticated()) {
      return null;
    }
    
    try {
      return await this.getCurrentUser();
    } catch (error) {
      console.error('Failed to refresh auth state:', error);
      return null;
    }
  }
}

export { AuthService, TokenManager, apiClient };
export default AuthService;