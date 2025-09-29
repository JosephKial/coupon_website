import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormHelperText,
  Chip,
  InputAdornment,
  Alert,
  CircularProgress,
  Grid,
  Typography,
  useTheme,
  useMediaQuery,
} from '@mui/material';
// Date picker imports - will be added when needed
// import { DatePicker } from '@mui/x-date-pickers/DatePicker';
// import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
// import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { Coupon } from '../../types';
import { couponService, CreateCouponData, UpdateCouponData } from '../../services/couponService';

interface CouponFormProps {
  coupon?: Coupon;
  onSubmit: (coupon: Coupon) => void;
  onCancel: () => void;
  isEdit?: boolean;
}

interface FormData {
  code: string;
  description: string;
  discountType: 'amount' | 'percentage';
  faceValue: string;
  expirationDate: Date | null;
  usageLimit: string;
  status: 'active' | 'expired' | 'used' | 'disabled';
  tags: string[];
}

interface FormErrors {
  code?: string;
  description?: string;
  faceValue?: string;
  expirationDate?: string;
  usageLimit?: string;
  tags?: string;
  submit?: string;
}

const initialFormData: FormData = {
  code: '',
  description: '',
  discountType: 'amount',
  faceValue: '',
  expirationDate: null,
  usageLimit: '',
  status: 'active',
  tags: [],
};

export const CouponForm: React.FC<CouponFormProps> = ({
  coupon,
  onSubmit,
  onCancel,
  isEdit = false,
}) => {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Initialize form data when editing
  useEffect(() => {
    if (coupon && isEdit) {
      setFormData({
        code: coupon.code,
        description: coupon.description || '',
        discountType: coupon.discountType,
        faceValue: coupon.faceValue.toString(),
        expirationDate: coupon.expirationDate ? new Date(coupon.expirationDate) : null,
        usageLimit: coupon.usageLimit?.toString() || '',
        status: coupon.status,
        tags: coupon.tags || [],
      });
    }
  }, [coupon, isEdit]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Code validation
    if (!formData.code.trim()) {
      newErrors.code = 'Coupon code is required';
    } else if (formData.code.length < 3) {
      newErrors.code = 'Coupon code must be at least 3 characters';
    } else if (formData.code.length > 50) {
      newErrors.code = 'Coupon code must be less than 50 characters';
    } else if (!/^[A-Za-z0-9_-]+$/.test(formData.code)) {
      newErrors.code = 'Coupon code can only contain letters, numbers, hyphens, and underscores';
    }

    // Description validation
    if (formData.description && formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    // Face value validation
    if (!formData.faceValue.trim()) {
      newErrors.faceValue = 'Face value is required';
    } else {
      const value = parseFloat(formData.faceValue);
      if (isNaN(value) || value <= 0) {
        newErrors.faceValue = 'Face value must be a positive number';
      } else if (formData.discountType === 'percentage' && value > 100) {
        newErrors.faceValue = 'Percentage discount cannot exceed 100%';
      } else if (value > 999999.99) {
        newErrors.faceValue = 'Face value is too large';
      }
    }

    // Expiration date validation
    if (formData.expirationDate && formData.expirationDate < new Date()) {
      newErrors.expirationDate = 'Expiration date cannot be in the past';
    }

    // Usage limit validation
    if (formData.usageLimit.trim()) {
      const limit = parseInt(formData.usageLimit);
      if (isNaN(limit) || limit <= 0) {
        newErrors.usageLimit = 'Usage limit must be a positive integer';
      } else if (limit > 999999) {
        newErrors.usageLimit = 'Usage limit is too large';
      }
    }

    // Tags validation
    if (formData.tags.length > 10) {
      newErrors.tags = 'Maximum 10 tags allowed';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: unknown } }
  ) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleDateChange = (date: Date | null) => {
    setFormData(prev => ({ ...prev, expirationDate: date }));
    if (errors.expirationDate) {
      setErrors(prev => ({ ...prev, expirationDate: undefined }));
    }
  };

  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags.includes(tag) && formData.tags.length < 10) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleTagInputKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const submitData: CreateCouponData | UpdateCouponData = {
        code: formData.code.trim(),
        description: formData.description.trim() || undefined,
        discountType: formData.discountType,
        faceValue: parseFloat(formData.faceValue),
        expirationDate: formData.expirationDate?.toISOString().split('T')[0],
        usageLimit: formData.usageLimit.trim() ? parseInt(formData.usageLimit) : undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
      };

      // Add status for updates
      if (isEdit && coupon) {
        (submitData as UpdateCouponData).status = formData.status;
      }

      let response;
      if (isEdit && coupon) {
        response = await couponService.updateCoupon(coupon.id, submitData as UpdateCouponData);
      } else {
        response = await couponService.createCoupon(submitData as CreateCouponData);
      }

      if (response.success && response.data) {
        onSubmit(response.data);
      } else {
        setErrors({
          submit: response.error?.message || 'An error occurred while saving the coupon'
        });
      }
    } catch (error) {
      setErrors({
        submit: 'An unexpected error occurred. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card
      sx={{
        // Enhanced mobile form styling
        '& .MuiTextField-root': {
          '& .MuiInputBase-root': {
            minHeight: isMobile ? 56 : 48, // Larger touch targets on mobile
          },
          '& .MuiInputLabel-root': {
            fontSize: isMobile ? '1rem' : '0.875rem',
          },
        },
        '& .MuiButton-root': {
          minHeight: isMobile ? 48 : 36,
          fontSize: isMobile ? '1rem' : '0.875rem',
          padding: isMobile ? '12px 24px' : '6px 16px',
        },
        '& .MuiSelect-select': {
          minHeight: isMobile ? 56 : 48,
        },
        '& .MuiChip-root': {
          minHeight: isMobile ? 36 : 32,
          fontSize: isMobile ? '0.875rem' : '0.8125rem',
        },
      }}
    >
        <CardHeader
          title={
            <Typography variant={isMobile ? "h5" : "h6"}>
              {isEdit ? 'Edit Coupon' : 'Create New Coupon'}
            </Typography>
          }
        />
        <CardContent>
          <Box 
            component="form" 
            onSubmit={handleSubmit} 
            noValidate
            sx={{
              // Improve form spacing on mobile
              '& .MuiGrid-item': {
                paddingBottom: isMobile ? 2 : 1.5,
              },
            }}
          >
            <Grid container spacing={isMobile ? 2 : 3}>
              {/* Coupon Code */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Coupon Code"
                  value={formData.code}
                  onChange={handleInputChange('code')}
                  error={!!errors.code}
                  helperText={errors.code || 'Enter a unique coupon code'}
                  required
                  placeholder="e.g., SAVE20, WELCOME10"
                  inputProps={{
                    autoCapitalize: 'characters',
                    autoComplete: 'off',
                    inputMode: 'text',
                  }}
                />
              </Grid>

              {/* Discount Type */}
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Discount Type</InputLabel>
                  <Select
                    value={formData.discountType}
                    onChange={handleInputChange('discountType')}
                    label="Discount Type"
                  >
                    <MenuItem value="amount">Fixed Amount ($)</MenuItem>
                    <MenuItem value="percentage">Percentage (%)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Face Value */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Face Value"
                  type="number"
                  value={formData.faceValue}
                  onChange={handleInputChange('faceValue')}
                  error={!!errors.faceValue}
                  helperText={errors.faceValue}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        {formData.discountType === 'amount' ? '$' : '%'}
                      </InputAdornment>
                    ),
                  }}
                  inputProps={{
                    min: 0,
                    step: formData.discountType === 'amount' ? '0.01' : '1',
                    max: formData.discountType === 'percentage' ? 100 : undefined,
                    inputMode: 'decimal',
                    pattern: '[0-9]*\\.?[0-9]*',
                  }}
                />
              </Grid>

              {/* Usage Limit */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Usage Limit"
                  type="number"
                  value={formData.usageLimit}
                  onChange={handleInputChange('usageLimit')}
                  error={!!errors.usageLimit}
                  helperText={errors.usageLimit || 'Leave empty for unlimited uses'}
                  inputProps={{
                    min: 1,
                    step: 1,
                    inputMode: 'numeric',
                    pattern: '[0-9]*',
                  }}
                />
              </Grid>

              {/* Expiration Date */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Expiration Date"
                  type="date"
                  value={formData.expirationDate ? formData.expirationDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => handleDateChange(e.target.value ? new Date(e.target.value) : null)}
                  error={!!errors.expirationDate}
                  helperText={errors.expirationDate || 'Leave empty for no expiration'}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  inputProps={{
                    min: new Date().toISOString().split('T')[0],
                  }}
                />
              </Grid>

              {/* Status (only for edit) */}
              {isEdit && (
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={formData.status}
                      onChange={handleInputChange('status')}
                      label="Status"
                    >
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="disabled">Disabled</MenuItem>
                      <MenuItem value="expired">Expired</MenuItem>
                      <MenuItem value="used">Used</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}

              {/* Description */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={handleInputChange('description')}
                  error={!!errors.description}
                  helperText={errors.description || 'Optional description of the coupon'}
                  placeholder="e.g., 20% off all items, valid until end of month"
                />
              </Grid>

              {/* Tags */}
              <Grid item xs={12}>
                <Box>
                  <TextField
                    fullWidth
                    label="Add Tags"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={handleTagInputKeyPress}
                    error={!!errors.tags}
                    helperText={errors.tags || 'Press Enter to add tags (max 10)'}
                    placeholder="e.g., grocery, restaurant, online"
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <Button
                            onClick={handleAddTag}
                            disabled={!tagInput.trim() || formData.tags.length >= 10}
                            size="small"
                          >
                            Add
                          </Button>
                        </InputAdornment>
                      ),
                    }}
                  />
                  {formData.tags.length > 0 && (
                    <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {formData.tags.map((tag) => (
                        <Chip
                          key={tag}
                          label={tag}
                          onDelete={() => handleRemoveTag(tag)}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  )}
                </Box>
              </Grid>

              {/* Submit Error */}
              {errors.submit && (
                <Grid item xs={12}>
                  <Alert severity="error">{errors.submit}</Alert>
                </Grid>
              )}

              {/* Action Buttons */}
              <Grid item xs={12}>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    gap: 2, 
                    justifyContent: isMobile ? 'stretch' : 'flex-end',
                    flexDirection: isMobile ? 'column-reverse' : 'row',
                  }}
                >
                  <Button
                    variant="outlined"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    fullWidth={isMobile}
                    size={isMobile ? 'large' : 'medium'}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={isSubmitting}
                    startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
                    fullWidth={isMobile}
                    size={isMobile ? 'large' : 'medium'}
                  >
                    {isSubmitting
                      ? (isEdit ? 'Updating...' : 'Creating...')
                      : (isEdit ? 'Update Coupon' : 'Create Coupon')
                    }
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>
  );
};