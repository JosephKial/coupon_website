import { format, isAfter, isBefore, parseISO, isValid } from 'date-fns';
import { clsx } from 'clsx';

// Date formatting utilities
export const formatDate = (dateString?: string): string => {
  if (!dateString) return '';
  
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return '';
    return format(date, 'MMM dd, yyyy');
  } catch {
    return '';
  }
};

export const formatDateTime = (dateString?: string): string => {
  if (!dateString) return '';
  
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return '';
    return format(date, 'MMM dd, yyyy HH:mm');
  } catch {
    return '';
  }
};

export const isExpired = (expiryDate?: string): boolean => {
  if (!expiryDate) return false;
  
  try {
    const expiry = parseISO(expiryDate);
    if (!isValid(expiry)) return false;
    return isAfter(new Date(), expiry);
  } catch {
    return false;
  }
};

export const isExpiringSoon = (expiryDate?: string, daysThreshold: number = 7): boolean => {
  if (!expiryDate) return false;
  
  try {
    const expiry = parseISO(expiryDate);
    if (!isValid(expiry)) return false;
    
    const now = new Date();
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + daysThreshold);
    
    return isAfter(expiry, now) && isBefore(expiry, threshold);
  } catch {
    return false;
  }
};

// CSS class name utility
export const cn = (...classes: (string | undefined | null | false)[]): string => {
  return clsx(classes);
};

// Currency formatting
export const formatCurrency = (amount?: number, currency: string = 'USD'): string => {
  if (amount === undefined || amount === null) return '';
  
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
};

// Discount formatting
export const formatDiscount = (amount?: number, type?: string): string => {
  if (amount === undefined || amount === null) return '';
  
  switch (type) {
    case 'percentage':
      return `${amount}%`;
    case 'fixed_amount':
      return formatCurrency(amount);
    default:
      return amount.toString();
  }
};

// String utilities
export const truncateText = (text: string, maxLength: number = 100): string => {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

export const capitalize = (text: string): string => {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

// Validation utilities
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPassword = (password: string): boolean => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  return password.length >= 8 &&
         /[A-Z]/.test(password) &&
         /[a-z]/.test(password) &&
         /\d/.test(password);
};

// URL utilities
export const createQueryString = (params: Record<string, any>): string => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value.toString());
    }
  });
  
  return searchParams.toString();
};

// Storage utilities
export const safeLocalStorage = {
  get: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set: (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  remove: (key: string): boolean => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },
};

// Debounce utility
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Generate unique ID
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Color utilities for coupon categories
export const getCategoryColor = (category?: string): string => {
  if (!category) return 'bg-gray-100 text-gray-800';
  
  const colors: Record<string, string> = {
    food: 'bg-orange-100 text-orange-800',
    clothing: 'bg-purple-100 text-purple-800',
    electronics: 'bg-blue-100 text-blue-800',
    home: 'bg-green-100 text-green-800',
    beauty: 'bg-pink-100 text-pink-800',
    travel: 'bg-indigo-100 text-indigo-800',
    entertainment: 'bg-yellow-100 text-yellow-800',
    health: 'bg-teal-100 text-teal-800',
    automotive: 'bg-red-100 text-red-800',
    sports: 'bg-cyan-100 text-cyan-800',
  };
  
  return colors[category.toLowerCase()] || 'bg-gray-100 text-gray-800';
};

// Status utilities
export const getCouponStatusInfo = (coupon: { is_used?: boolean; expiry_date?: string }) => {
  if (coupon.is_used) {
    return {
      status: 'used',
      label: 'Used',
      className: 'bg-gray-100 text-gray-800',
    };
  }
  
  if (isExpired(coupon.expiry_date)) {
    return {
      status: 'expired',
      label: 'Expired',
      className: 'bg-red-100 text-red-800',
    };
  }
  
  if (isExpiringSoon(coupon.expiry_date)) {
    return {
      status: 'expiring',
      label: 'Expiring Soon',
      className: 'bg-yellow-100 text-yellow-800',
    };
  }
  
  return {
    status: 'active',
    label: 'Active',
    className: 'bg-green-100 text-green-800',
  };
};