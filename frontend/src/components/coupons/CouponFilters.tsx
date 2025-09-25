import React, { useState, useEffect } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { CouponFilters as CouponFiltersType } from '@/types';
import Button from '@/components/ui/Button';
import { debounce } from '@/utils';

interface CouponFiltersProps {
  filters: CouponFiltersType;
  onFiltersChange: (filters: CouponFiltersType) => void;
  isLoading?: boolean;
}

const CouponFilters: React.FC<CouponFiltersProps> = ({
  filters,
  onFiltersChange,
  isLoading = false,
}) => {
  const [localFilters, setLocalFilters] = useState<CouponFiltersType>(filters);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Debounced search to avoid too many API calls
  const debouncedSearch = debounce((searchTerm: string) => {
    onFiltersChange({ ...localFilters, search: searchTerm });
  }, 500);

  useEffect(() => {
    if (localFilters.search !== filters.search) {
      debouncedSearch(localFilters.search || '');
    }
  }, [localFilters.search]);

  // Handle non-search filter changes immediately
  const handleFilterChange = (key: keyof CouponFiltersType, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    
    if (key !== 'search') {
      onFiltersChange(newFilters);
    }
  };

  const clearFilters = () => {
    const emptyFilters: CouponFiltersType = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== undefined && value !== '' && value !== null
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search coupons by title, store, or description..."
          value={localFilters.search || ''}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          disabled={isLoading}
          className="form-input pl-10 w-full"
        />
      </div>

      {/* Quick Filters Row */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Store:</label>
          <input
            type="text"
            placeholder="Any store"
            value={localFilters.store_name || ''}
            onChange={(e) => handleFilterChange('store_name', e.target.value)}
            disabled={isLoading}
            className="form-input w-32"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Status:</label>
          <select
            value={localFilters.is_used?.toString() || ''}
            onChange={(e) => handleFilterChange('is_used', 
              e.target.value === '' ? undefined : e.target.value === 'true'
            )}
            disabled={isLoading}
            className="form-select w-32"
          >
            <option value="">All</option>
            <option value="false">Active</option>
            <option value="true">Used</option>
          </select>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          disabled={isLoading}
        >
          <Filter className="w-4 h-4 mr-1" />
          {showAdvanced ? 'Hide' : 'More'} Filters
        </Button>

        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            disabled={isLoading}
          >
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t">
          <div>
            <label className="form-label">Category</label>
            <select
              value={localFilters.category || ''}
              onChange={(e) => handleFilterChange('category', e.target.value || undefined)}
              disabled={isLoading}
              className="form-select"
            >
              <option value="">All Categories</option>
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
          </div>

          <div>
            <label className="form-label">Discount Type</label>
            <select
              value={localFilters.discount_type || ''}
              onChange={(e) => handleFilterChange('discount_type', 
                e.target.value as 'percentage' | 'fixed_amount' | 'other' | undefined || undefined
              )}
              disabled={isLoading}
              className="form-select"
            >
              <option value="">All Types</option>
              <option value="percentage">Percentage</option>
              <option value="fixed_amount">Fixed Amount</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="form-label">Min Discount</label>
            <input
              type="number"
              placeholder="0"
              min="0"
              value={localFilters.min_discount || ''}
              onChange={(e) => handleFilterChange('min_discount', 
                e.target.value ? parseFloat(e.target.value) : undefined
              )}
              disabled={isLoading}
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">Max Discount</label>
            <input
              type="number"
              placeholder="100"
              min="0"
              value={localFilters.max_discount || ''}
              onChange={(e) => handleFilterChange('max_discount', 
                e.target.value ? parseFloat(e.target.value) : undefined
              )}
              disabled={isLoading}
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">Expires After</label>
            <input
              type="date"
              value={localFilters.expiry_date_from || ''}
              onChange={(e) => handleFilterChange('expiry_date_from', e.target.value || undefined)}
              disabled={isLoading}
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">Expires Before</label>
            <input
              type="date"
              value={localFilters.expiry_date_to || ''}
              onChange={(e) => handleFilterChange('expiry_date_to', e.target.value || undefined)}
              disabled={isLoading}
              className="form-input"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CouponFilters;