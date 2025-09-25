import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import CouponForm from '@/components/coupons/CouponForm';
import { useCoupons } from '@/hooks/useCoupons';
import { CouponCreateRequest } from '@/types';
import Button from '@/components/ui/Button';

const CreateCouponPage = () => {
  const navigate = useNavigate();
  const { createCoupon } = useCoupons();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: CouponCreateRequest) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await createCoupon(data);
      
      toast.success('Coupon created successfully!');
      navigate('/');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create coupon';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Coupon</h1>
          <p className="text-gray-600">Create a new coupon for your family</p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl">
        <CouponForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
          error={error}
        />
      </div>
    </div>
  );
};

export default CreateCouponPage;