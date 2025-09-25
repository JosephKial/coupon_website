import { useNavigate, Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import LoginForm from '@/components/auth/LoginForm';
import { useAuth } from '@/hooks/useAuth';
import { LoginRequest } from '@/types';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isLoading, error, isAuthenticated } = useAuth();

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (credentials: LoginRequest) => {
    try {
      await login(credentials);
      toast.success('Welcome back! You have been logged in successfully.');
      navigate('/', { replace: true });
    } catch (error) {
      // Error is already handled in the hook
      console.error('Login failed:', error);
    }
  };

  return (
    <LoginForm
      onSubmit={handleLogin}
      isLoading={isLoading}
      error={error}
    />
  );
};

export default LoginPage;