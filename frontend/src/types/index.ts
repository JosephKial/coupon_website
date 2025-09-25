// User and Authentication types
export interface User {
  id: number;
  email: string;
  family_name: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  family_name: string;
  first_name: string;
  last_name: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// Coupon types
export interface Coupon {
  id: number;
  title: string;
  description?: string;
  store_name: string;
  discount_amount?: number;
  discount_type: 'percentage' | 'fixed_amount' | 'other';
  coupon_code?: string;
  start_date?: string;
  expiry_date?: string;
  is_used: boolean;
  category?: string;
  family_id: number;
  created_by_id: number;
  created_at: string;
  updated_at: string;
  created_by?: User;
}

export interface CouponCreateRequest {
  title: string;
  description?: string;
  store_name: string;
  discount_amount?: number;
  discount_type: 'percentage' | 'fixed_amount' | 'other';
  coupon_code?: string;
  start_date?: string;
  expiry_date?: string;
  category?: string;
}

export interface CouponUpdateRequest extends Partial<CouponCreateRequest> {
  is_used?: boolean;
}

// Search and filter types
export interface CouponFilters {
  search?: string;
  store_name?: string;
  category?: string;
  discount_type?: 'percentage' | 'fixed_amount' | 'other';
  is_used?: boolean;
  expiry_date_from?: string;
  expiry_date_to?: string;
  min_discount?: number;
  max_discount?: number;
}

export interface PaginationParams {
  skip?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

// API Response types
export interface ApiError {
  detail: string;
  status_code: number;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: ApiError;
}

// Form validation types
export interface FormErrors {
  [key: string]: string | undefined;
}

// UI State types
export interface LoadingState {
  [key: string]: boolean;
}

export interface NotificationMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

// Component prop types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface ButtonProps extends BaseComponentProps {
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  asChild?: boolean;
}

export interface InputProps extends BaseComponentProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'date';
  placeholder?: string;
  value?: string | number;
  onChange?: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
}