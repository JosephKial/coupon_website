import { useNavigate, Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import RegisterForm from '@/components/auth/RegisterForm';
import { useAuth } from '@/hooks/useAuth';
import { RegisterRequest } from '@/types';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, isLoading, error, isAuthenticated } = useAuth();

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleRegister = async (userData: RegisterRequest) => {
    try {
      await register(userData);
      toast.success('Account created successfully! Welcome to your family coupon manager.');
      navigate('/', { replace: true });
    } catch (error) {
      // Error is already handled in the hook
      console.error('Registration failed:', error);
    }
  };

  return (
    <RegisterForm
      onSubmit={handleRegister}
      isLoading={isLoading}
      error={error}
    />
  );
};

export default RegisterPage;