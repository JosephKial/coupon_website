import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
// @ts-ignore - Type definitions issue with @hookform/resolvers
import { yupResolver } from '@hookform/resolvers/yup';
import { RegisterRequest } from '@/types';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { isValidEmail, isValidPassword } from '@/utils';

interface RegisterFormProps {
  onSubmit: (data: RegisterRequest) => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

const registerSchema = yup.object({
  email: yup
    .string()
    .required('Email is required')
    .test('valid-email', 'Please enter a valid email address', (value) =>
      value ? isValidEmail(value) : false
    ),
  password: yup
    .string()
    .required('Password is required')
    .test(
      'valid-password',
      'Password must be at least 8 characters with uppercase, lowercase, and number',
      (value) => value ? isValidPassword(value) : false
    ),
  confirmPassword: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('password')], 'Passwords must match'),
  family_name: yup
    .string()
    .required('Family name is required')
    .min(2, 'Family name must be at least 2 characters'),
  first_name: yup
    .string()
    .required('First name is required')
    .min(2, 'First name must be at least 2 characters'),
  last_name: yup
    .string()
    .required('Last name is required')
    .min(2, 'Last name must be at least 2 characters'),
});

interface RegisterFormData extends RegisterRequest {
  confirmPassword: string;
}

const RegisterForm = ({ onSubmit, isLoading = false, error }: RegisterFormProps) => {
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: yupResolver(registerSchema),
  });

  const onFormSubmit = async (data: RegisterFormData) => {
    const { confirmPassword, ...registerData } = data;
    await onSubmit(registerData);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Create Account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Join your family's coupon sharing network
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className="form-label">
                  First Name
                </label>
                <input
                  id="first_name"
                  type="text"
                  {...register('first_name')}
                  className={`form-input ${errors.first_name ? 'error' : ''}`}
                  placeholder="John"
                />
                {errors.first_name && (
                  <p className="form-error">{errors.first_name.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="last_name" className="form-label">
                  Last Name
                </label>
                <input
                  id="last_name"
                  type="text"
                  {...register('last_name')}
                  className={`form-input ${errors.last_name ? 'error' : ''}`}
                  placeholder="Doe"
                />
                {errors.last_name && (
                  <p className="form-error">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="family_name" className="form-label">
                Family Name
              </label>
              <input
                id="family_name"
                type="text"
                {...register('family_name')}
                className={`form-input ${errors.family_name ? 'error' : ''}`}
                placeholder="The Doe Family"
              />
              {errors.family_name && (
                <p className="form-error">{errors.family_name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                {...register('email')}
                className={`form-input ${errors.email ? 'error' : ''}`}
                placeholder="john@example.com"
              />
              {errors.email && (
                <p className="form-error">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  className={`form-input ${errors.password ? 'error' : ''}`}
                  placeholder="Create a strong password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="text-sm text-gray-500">
                    {showPassword ? 'Hide' : 'Show'}
                  </span>
                </button>
              </div>
              {errors.password && (
                <p className="form-error">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="form-label">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                {...register('confirmPassword')}
                className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                placeholder="Confirm your password"
              />
              {errors.confirmPassword && (
                <p className="form-error">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full mt-6"
              loading={isLoading}
              disabled={isLoading}
            >
              Create Account
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Sign in
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RegisterForm;