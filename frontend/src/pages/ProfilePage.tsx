import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
// @ts-ignore - Type definitions issue with @hookform/resolvers
import { yupResolver } from '@hookform/resolvers/yup';
import { toast } from 'react-hot-toast';
import { User, Settings, Save } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { isValidEmail } from '@/utils';

interface ProfileFormData {
  first_name: string;
  last_name: string;
  email: string;
  family_name: string;
}

const profileSchema = yup.object({
  first_name: yup
    .string()
    .required('First name is required')
    .min(2, 'First name must be at least 2 characters'),
  last_name: yup
    .string()
    .required('Last name is required')
    .min(2, 'Last name must be at least 2 characters'),
  email: yup
    .string()
    .required('Email is required')
    .test('valid-email', 'Please enter a valid email address', (value) =>
      value ? isValidEmail(value) : false
    ),
  family_name: yup
    .string()
    .required('Family name is required')
    .min(2, 'Family name must be at least 2 characters'),
});

const ProfilePage = () => {
  const { user, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileFormData>({
    resolver: yupResolver(profileSchema),
    defaultValues: user ? {
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      family_name: user.family_name,
    } : undefined,
  });

  const onSubmit = async (_data: ProfileFormData) => {
    try {
      setIsLoading(true);
      
      // Here you would typically call an API to update the user profile
      // For now, we'll just simulate it and show success
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('Profile updated successfully!');
      setIsEditing(false);
      
      // Refresh user data
      await refreshUser();
    } catch (error) {
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    reset();
    setIsEditing(false);
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <User className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600">Manage your account information</p>
        </div>
      </div>

      {/* Profile Information */}
      <div className="max-w-2xl">
        <Card 
          title="Account Information"
          headerActions={
            !isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Settings className="w-4 h-4 mr-1" />
                Edit Profile
              </Button>
            )
          }
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className="form-label">
                  First Name
                </label>
                <input
                  id="first_name"
                  type="text"
                  {...register('first_name')}
                  disabled={!isEditing || isLoading}
                  className={`form-input ${errors.first_name ? 'error' : ''} ${
                    !isEditing ? 'bg-gray-50' : ''
                  }`}
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
                  disabled={!isEditing || isLoading}
                  className={`form-input ${errors.last_name ? 'error' : ''} ${
                    !isEditing ? 'bg-gray-50' : ''
                  }`}
                />
                {errors.last_name && (
                  <p className="form-error">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                {...register('email')}
                disabled={!isEditing || isLoading}
                className={`form-input ${errors.email ? 'error' : ''} ${
                  !isEditing ? 'bg-gray-50' : ''
                }`}
              />
              {errors.email && (
                <p className="form-error">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="family_name" className="form-label">
                Family Name
              </label>
              <input
                id="family_name"
                type="text"
                {...register('family_name')}
                disabled={!isEditing || isLoading}
                className={`form-input ${errors.family_name ? 'error' : ''} ${
                  !isEditing ? 'bg-gray-50' : ''
                }`}
              />
              {errors.family_name && (
                <p className="form-error">{errors.family_name.message}</p>
              )}
            </div>

            {isEditing && (
              <div className="flex flex-col sm:flex-row gap-3 pt-6">
                <Button
                  type="submit"
                  loading={isLoading}
                  disabled={isLoading}
                  className="flex-1 sm:flex-none"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="flex-1 sm:flex-none"
                >
                  Cancel
                </Button>
              </div>
            )}
          </form>
        </Card>

        {/* Account Details */}
        <Card title="Account Details" className="mt-6">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Account Status:</span>
              <span className={`font-medium ${
                user.is_active ? 'text-green-600' : 'text-red-600'
              }`}>
                {user.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Member Since:</span>
              <span className="font-medium">
                {new Date(user.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Last Updated:</span>
              <span className="font-medium">
                {new Date(user.updated_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;