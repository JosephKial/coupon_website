import { useMutation } from '@tanstack/react-query';
import { authService } from '../services/authService';
import { LoginCredentials, RegisterData } from '../types';
import { useAuth } from './useAuth';

export const useLogin = () => {
  const { login } = useAuth();
  
  return useMutation({
    mutationFn: (credentials: LoginCredentials) => login(credentials.email, credentials.password),
    onError: (error) => {
      console.error('Login error:', error);
    },
  });
};

export const useRegister = () => {
  const { register } = useAuth();
  
  return useMutation({
    mutationFn: (data: RegisterData) => register(data),
    onError: (error) => {
      console.error('Registration error:', error);
    },
  });
};

export const useLogout = () => {
  const { logout } = useAuth();
  
  return useMutation({
    mutationFn: () => logout(),
    onError: (error) => {
      console.error('Logout error:', error);
    },
  });
};

export const useRefreshToken = () => {
  const { refreshToken } = useAuth();
  
  return useMutation({
    mutationFn: () => refreshToken(),
    onError: (error) => {
      console.error('Token refresh error:', error);
    },
  });
};