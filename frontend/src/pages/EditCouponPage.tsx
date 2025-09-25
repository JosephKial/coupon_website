import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import CouponForm from '@/components/coupons/CouponForm';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useCoupons } from '@/hooks/useCoupons';
import CouponService from '@/services/coupons';
import { Coupon, CouponUpdateRequest } from '@/types';
import Button from '@/components/ui/Button';

const EditCouponPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateCoupon } = useCoupons();
  
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [isLoadingCoupon, setIsLoadingCoupon] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load coupon data
  useEffect(() => {
    const loadCoupon = async () => {
      if (!id) {
        navigate('/');
        return;
      }

      try {
        setIsLoadingCoupon(true);
        const couponData = await CouponService.getCoupon(parseInt(id, 10));
        setCoupon(couponData);
      } catch (error) {
        console.error('Failed to load coupon:', error);
        toast.error('Failed to load coupon');
        navigate('/');
      } finally {
        setIsLoadingCoupon(false);
      }
    };

    loadCoupon();
  }, [id, navigate]);

  const handleSubmit = async (data: CouponUpdateRequest) => {
    if (!coupon) return;

    try {
      setIsSubmitting(true);
      setError(null);
      
      await updateCoupon(coupon.id, data);
      
      toast.success('Coupon updated successfully!');
      navigate('/');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update coupon';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/');
  };

  if (isLoadingCoupon) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" message="Loading coupon..." />
      </div>
    );
  }

  if (!coupon) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Coupon not found</p>
        <Button onClick={() => navigate('/')} className="mt-4">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Coupon</h1>
          <p className="text-gray-600">Update coupon information</p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl">
        <CouponForm
          coupon={coupon}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isSubmitting}
          error={error}
        />
      </div>
    </div>
  );
};

export default EditCouponPage;