import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { useCoupons } from '@/hooks/useCoupons';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import CouponCard from '@/components/coupons/CouponCard';

const DashboardPage = () => {
  const { coupons, isLoading, error } = useCoupons({}, { limit: 6 });
  const [stats, setStats] = useState({
    total: 0,
    used: 0,
    unused: 0,
    expired: 0,
    expiring_soon: 0,
  });

  // Calculate stats from coupons
  useEffect(() => {
    const now = new Date();
    const soonThreshold = new Date();
    soonThreshold.setDate(soonThreshold.getDate() + 7);

    const calculatedStats = coupons.reduce(
      (acc, coupon) => {
        acc.total += 1;
        if (coupon.is_used) {
          acc.used += 1;
        } else {
          acc.unused += 1;
          if (coupon.expiry_date) {
            const expiryDate = new Date(coupon.expiry_date);
            if (expiryDate < now) {
              acc.expired += 1;
            } else if (expiryDate < soonThreshold) {
              acc.expiring_soon += 1;
            }
          }
        }
        return acc;
      },
      { total: 0, used: 0, unused: 0, expired: 0, expiring_soon: 0 }
    );

    setStats(calculatedStats);
  }, [coupons]);

  if (isLoading && coupons.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" message="Loading your coupons..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Manage your family's coupons and savings</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link to="/coupons">
              <Search className="w-4 h-4 mr-2" />
              Browse All
            </Link>
          </Button>
          <Button asChild>
            <Link to="/coupons/new">
              <Plus className="w-4 h-4 mr-2" />
              Add Coupon
            </Link>
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Coupons</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active Coupons</p>
              <p className="text-2xl font-bold text-gray-900">{stats.unused}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Expiring Soon</p>
              <p className="text-2xl font-bold text-gray-900">{stats.expiring_soon}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-gray-600 font-semibold">✓</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Used Coupons</p>
              <p className="text-2xl font-bold text-gray-900">{stats.used}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Coupons */}
      <Card title="Recent Coupons" headerActions={
        <Link to="/coupons" className="text-sm text-blue-600 hover:text-blue-700">
          View all →
        </Link>
      }>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {coupons.length === 0 && !isLoading ? (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <Plus className="h-12 w-12" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No coupons yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding your first coupon.
            </p>
            <div className="mt-6">
              <Button asChild>
                <Link to="/coupons/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Coupon
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coupons.map((coupon) => (
              <CouponCard key={coupon.id} coupon={coupon} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default DashboardPage;