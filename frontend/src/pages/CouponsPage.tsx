import { Link } from 'react-router-dom';
import { Plus, ArrowLeft, ArrowRight } from 'lucide-react';
import { useCoupons } from '@/hooks/useCoupons';
import { toast } from 'react-hot-toast';
import CouponCard from '@/components/coupons/CouponCard';
import CouponFilters from '@/components/coupons/CouponFilters';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';

const CouponsPage = () => {
  const {
    coupons,
    total,
    isLoading,
    error,
    filters,
    pagination,
    setFilters,
    setPagination,
    deleteCoupon,
    toggleCouponUsed,
  } = useCoupons();

  const handleDeleteCoupon = async (id: number) => {
    try {
      await deleteCoupon(id);
      toast.success('Coupon deleted successfully');
    } catch (error) {
      toast.error('Failed to delete coupon');
    }
  };

  const handleToggleCouponUsed = async (id: number, isUsed: boolean) => {
    try {
      await toggleCouponUsed(id, isUsed);
      toast.success(`Coupon marked as ${isUsed ? 'used' : 'unused'}`);
    } catch (error) {
      toast.error('Failed to update coupon status');
    }
  };

  const handlePageChange = (newSkip: number) => {
    setPagination({ skip: newSkip });
  };

  const totalPages = Math.ceil(total / pagination.limit);
  const currentPage = Math.floor(pagination.skip / pagination.limit) + 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Coupons</h1>
          <p className="text-gray-600">
            {total > 0 ? `${total} coupon${total !== 1 ? 's' : ''} found` : 'No coupons found'}
          </p>
        </div>
        <Button asChild>
          <Link to="/coupons/new">
            <Plus className="w-4 h-4 mr-2" />
            Add Coupon
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <CouponFilters
        filters={filters}
        onFiltersChange={setFilters}
        isLoading={isLoading}
      />

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && coupons.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" message="Loading coupons..." />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && coupons.length === 0 && !error && (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
            <Plus className="h-12 w-12" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No coupons found</h3>
          <p className="text-gray-500 mb-6">
            {Object.values(filters).some(v => v !== undefined && v !== '') 
              ? 'Try adjusting your search filters or add a new coupon.'
              : 'Get started by adding your first coupon.'
            }
          </p>
          <Button asChild>
            <Link to="/coupons/new">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Coupon
            </Link>
          </Button>
        </div>
      )}

      {/* Coupons Grid */}
      {coupons.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coupons.map((coupon) => (
              <CouponCard
                key={coupon.id}
                coupon={coupon}
                onToggleUsed={handleToggleCouponUsed}
                onDelete={handleDeleteCoupon}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-6">
              <div className="text-sm text-gray-700">
                Showing {pagination.skip + 1} to {Math.min(pagination.skip + pagination.limit, total)} of {total} results
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.skip - pagination.limit)}
                  disabled={currentPage === 1 || isLoading}
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                
                <span className="text-sm text-gray-700 px-3">
                  Page {currentPage} of {totalPages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.skip + pagination.limit)}
                  disabled={currentPage === totalPages || isLoading}
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Loading overlay for pagination */}
      {isLoading && coupons.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 shadow-lg">
            <LoadingSpinner message="Loading..." />
          </div>
        </div>
      )}
    </div>
  );
};

export default CouponsPage;