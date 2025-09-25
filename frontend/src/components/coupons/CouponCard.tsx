import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Store, Tag, MoreVertical, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { Coupon } from '@/types';
import { formatDate, formatDiscount, getCategoryColor, getCouponStatusInfo, truncateText } from '@/utils';

interface CouponCardProps {
  coupon: Coupon;
  onToggleUsed?: (id: number, isUsed: boolean) => void;
  onDelete?: (id: number) => void;
  showActions?: boolean;
}

const CouponCard = ({ 
  coupon, 
  onToggleUsed, 
  onDelete, 
  showActions = true 
}: CouponCardProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const statusInfo = getCouponStatusInfo(coupon);

  const handleToggleUsed = async () => {
    if (!onToggleUsed || isToggling) return;
    
    setIsToggling(true);
    try {
      await onToggleUsed(coupon.id, !coupon.is_used);
    } finally {
      setIsToggling(false);
      setShowMenu(false);
    }
  };

  const handleDelete = () => {
    if (!onDelete) return;
    
    if (window.confirm('Are you sure you want to delete this coupon?')) {
      onDelete(coupon.id);
    }
    setShowMenu(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
      <div className="p-4">
        {/* Header with status and menu */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}>
              {statusInfo.label}
            </span>
            {coupon.category && (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(coupon.category)}`}>
                {coupon.category}
              </span>
            )}
          </div>
          
          {showActions && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <MoreVertical className="w-4 h-4 text-gray-400" />
              </button>
              
              {showMenu && (
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border z-10">
                  <div className="py-1">
                    <Link
                      to={`/coupons/${coupon.id}/edit`}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setShowMenu(false)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Coupon
                    </Link>
                    
                    <button
                      onClick={handleToggleUsed}
                      disabled={isToggling}
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                    >
                      {coupon.is_used ? (
                        <>
                          <XCircle className="w-4 h-4 mr-2" />
                          Mark as Unused
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Mark as Used
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={handleDelete}
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Coupon
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Coupon title */}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {truncateText(coupon.title, 50)}
        </h3>

        {/* Description */}
        {coupon.description && (
          <p className="text-sm text-gray-600 mb-3">
            {truncateText(coupon.description, 100)}
          </p>
        )}

        {/* Store and discount info */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center text-sm text-gray-600">
            <Store className="w-4 h-4 mr-1" />
            {coupon.store_name}
          </div>
          
          {coupon.discount_amount && (
            <div className="flex items-center text-sm font-semibold text-green-600">
              <Tag className="w-4 h-4 mr-1" />
              {formatDiscount(coupon.discount_amount, coupon.discount_type)}
            </div>
          )}
        </div>

        {/* Coupon code */}
        {coupon.coupon_code && (
          <div className="bg-gray-50 rounded-md p-2 mb-3">
            <p className="text-xs text-gray-600 mb-1">Coupon Code</p>
            <p className="font-mono text-sm font-semibold text-gray-900 tracking-wider">
              {coupon.coupon_code}
            </p>
          </div>
        )}

        {/* Expiry date */}
        {coupon.expiry_date && (
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="w-4 h-4 mr-1" />
            Expires: {formatDate(coupon.expiry_date)}
          </div>
        )}

        {/* Created by info */}
        {coupon.created_by && (
          <div className="mt-2 text-xs text-gray-500">
            Added by {coupon.created_by.first_name} {coupon.created_by.last_name}
          </div>
        )}
      </div>
    </div>
  );
};

export default CouponCard;