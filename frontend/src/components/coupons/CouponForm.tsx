import React from 'react';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
// @ts-ignore - Type definitions issue with @hookform/resolvers
import { yupResolver } from '@hookform/resolvers/yup';
import { Coupon } from '@/types';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

interface CouponFormProps {
  coupon?: Coupon;
  onSubmit: (data: any) => Promise<void>; // Accept any to handle both create and update
  onCancel: () => void;
  isLoading?: boolean;
  error?: string | null;
}

const couponSchema = yup.object({
  title: yup
    .string()
    .required('Title is required')
    .min(2, 'Title must be at least 2 characters')
    .max(200, 'Title must be less than 200 characters'),
  description: yup
    .string()
    .max(1000, 'Description must be less than 1000 characters'),
  store_name: yup
    .string()
    .required('Store name is required')
    .min(2, 'Store name must be at least 2 characters')
    .max(100, 'Store name must be less than 100 characters'),
  discount_amount: yup
    .number()
    .min(0, 'Discount amount must be positive')
    .max(100000, 'Discount amount is too large'),
  discount_type: yup
    .string()
    .oneOf(['percentage', 'fixed_amount', 'other'], 'Please select a valid discount type'),
  coupon_code: yup
    .string()
    .max(50, 'Coupon code must be less than 50 characters'),
  start_date: yup.string(),
  expiry_date: yup.string(),
  category: yup
    .string()
    .max(50, 'Category must be less than 50 characters'),
});

type CouponFormData = {
  title: string;
  description?: string;
  store_name: string;
  discount_amount?: number;
  discount_type?: 'percentage' | 'fixed_amount' | 'other';
  coupon_code?: string;
  start_date?: string;
  expiry_date?: string;
  category?: string;
};

const CouponForm: React.FC<CouponFormProps> = ({
  coupon,
  onSubmit,
  onCancel,
  isLoading = false,
  error,
}) => {
  const isEditing = !!coupon;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CouponFormData>({
    resolver: yupResolver(couponSchema),
    defaultValues: coupon ? {
      title: coupon.title,
      description: coupon.description || '',
      store_name: coupon.store_name,
      discount_amount: coupon.discount_amount || undefined,
      discount_type: coupon.discount_type || 'percentage',
      coupon_code: coupon.coupon_code || '',
      start_date: coupon.start_date ? coupon.start_date.split('T')[0] : '',
      expiry_date: coupon.expiry_date ? coupon.expiry_date.split('T')[0] : '',
      category: coupon.category || '',
    } : {
      title: '',
      description: '',
      store_name: '',
      discount_amount: undefined,
      discount_type: 'percentage',
      coupon_code: '',
      start_date: '',
      expiry_date: '',
      category: '',
    },
  });

  const watchedDiscountType = watch('discount_type');

  const onFormSubmit = async (data: CouponFormData) => {
    // Convert empty strings to undefined for optional fields
    const cleanedData = {
      ...data,
      description: data.description?.trim() || undefined,
      discount_amount: data.discount_amount || undefined,
      coupon_code: data.coupon_code?.trim() || undefined,
      start_date: data.start_date || undefined,
      expiry_date: data.expiry_date || undefined,
      category: data.category?.trim() || undefined,
    };

    await onSubmit(cleanedData);
  };

  return (
    <Card title={isEditing ? 'Edit Coupon' : 'Add New Coupon'}>
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Title */}
        <div>
          <label htmlFor="title" className="form-label">
            Title *
          </label>
          <input
            id="title"
            type="text"
            {...register('title')}
            className={`form-input ${errors.title ? 'error' : ''}`}
            placeholder="Enter coupon title"
          />
          {errors.title && (
            <p className="form-error">{errors.title.message}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="form-label">
            Description
          </label>
          <textarea
            id="description"
            rows={3}
            {...register('description')}
            className={`form-input ${errors.description ? 'error' : ''}`}
            placeholder="Enter coupon description (optional)"
          />
          {errors.description && (
            <p className="form-error">{errors.description.message}</p>
          )}
        </div>

        {/* Store Name and Category */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="store_name" className="form-label">
              Store Name *
            </label>
            <input
              id="store_name"
              type="text"
              {...register('store_name')}
              className={`form-input ${errors.store_name ? 'error' : ''}`}
              placeholder="Enter store name"
            />
            {errors.store_name && (
              <p className="form-error">{errors.store_name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="category" className="form-label">
              Category
            </label>
            <select
              id="category"
              {...register('category')}
              className={`form-select ${errors.category ? 'error' : ''}`}
            >
              <option value="">Select category (optional)</option>
              <option value="food">Food & Dining</option>
              <option value="clothing">Clothing & Fashion</option>
              <option value="electronics">Electronics</option>
              <option value="home">Home & Garden</option>
              <option value="beauty">Beauty & Personal Care</option>
              <option value="travel">Travel</option>
              <option value="entertainment">Entertainment</option>
              <option value="health">Health & Wellness</option>
              <option value="automotive">Automotive</option>
              <option value="sports">Sports & Outdoors</option>
            </select>
            {errors.category && (
              <p className="form-error">{errors.category.message}</p>
            )}
          </div>
        </div>

        {/* Discount Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="discount_type" className="form-label">
              Discount Type
            </label>
            <select
              id="discount_type"
              {...register('discount_type')}
              className={`form-select ${errors.discount_type ? 'error' : ''}`}
            >
              <option value="">Select discount type (optional)</option>
              <option value="percentage">Percentage (%)</option>
              <option value="fixed_amount">Fixed Amount ($)</option>
              <option value="other">Other</option>
            </select>
            {errors.discount_type && (
              <p className="form-error">{errors.discount_type.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="discount_amount" className="form-label">
              Discount Amount
              {watchedDiscountType === 'percentage' && ' (%)'}
              {watchedDiscountType === 'fixed_amount' && ' ($)'}
            </label>
            <input
              id="discount_amount"
              type="number"
              step="0.01"
              min="0"
              {...register('discount_amount', { valueAsNumber: true })}
              className={`form-input ${errors.discount_amount ? 'error' : ''}`}
              placeholder={
                watchedDiscountType === 'percentage' ? '10' :
                watchedDiscountType === 'fixed_amount' ? '5.00' : 
                'Enter amount'
              }
            />
            {errors.discount_amount && (
              <p className="form-error">{errors.discount_amount.message}</p>
            )}
          </div>
        </div>

        {/* Coupon Code */}
        <div>
          <label htmlFor="coupon_code" className="form-label">
            Coupon Code
          </label>
          <input
            id="coupon_code"
            type="text"
            {...register('coupon_code')}
            className={`form-input ${errors.coupon_code ? 'error' : ''}`}
            placeholder="Enter coupon code (optional)"
            style={{ fontFamily: 'monospace' }}
          />
          {errors.coupon_code && (
            <p className="form-error">{errors.coupon_code.message}</p>
          )}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="start_date" className="form-label">
              Start Date
            </label>
            <input
              id="start_date"
              type="date"
              {...register('start_date')}
              className={`form-input ${errors.start_date ? 'error' : ''}`}
            />
            {errors.start_date && (
              <p className="form-error">{errors.start_date.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="expiry_date" className="form-label">
              Expiry Date
            </label>
            <input
              id="expiry_date"
              type="date"
              {...register('expiry_date')}
              className={`form-input ${errors.expiry_date ? 'error' : ''}`}
            />
            {errors.expiry_date && (
              <p className="form-error">{errors.expiry_date.message}</p>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6">
          <Button
            type="submit"
            loading={isLoading}
            disabled={isLoading}
            className="flex-1 sm:flex-none"
          >
            {isEditing ? 'Update Coupon' : 'Create Coupon'}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default CouponForm;