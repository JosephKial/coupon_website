import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Paper,
  IconButton,
  Collapse,
  Typography,
  Chip,
  InputAdornment,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
// Note: Using regular date inputs instead of DatePicker to avoid import issues
// In a production environment, you would use @mui/x-date-pickers
import { CouponFilters } from '../../types';

interface CouponSearchProps {
  filters: CouponFilters;
  onFiltersChange: (filters: CouponFilters) => void;
  onSearchChange: (search: string) => void;
  searchQuery: string;
  isLoading?: boolean;
  resultCount?: number;
}

const DEBOUNCE_DELAY = 300;

export const CouponSearch: React.FC<CouponSearchProps> = ({
  filters,
  onFiltersChange,
  onSearchChange,
  searchQuery,
  isLoading = false,
  resultCount,
}) => {
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const [showFilters, setShowFilters] = useState(false);
  const [localFilters, setLocalFilters] = useState<CouponFilters>(filters);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      onSearchChange(query);
    }, DEBOUNCE_DELAY),
    [onSearchChange]
  );

  // Handle search input change
  useEffect(() => {
    debouncedSearch(localSearchQuery);
  }, [localSearchQuery, debouncedSearch]);

  // Sync external filters with local state
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Sync external search query with local state
  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearchQuery(event.target.value);
  };

  const handleFilterChange = (key: keyof CouponFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleClearSearch = () => {
    setLocalSearchQuery('');
    onSearchChange('');
  };

  const handleClearFilters = () => {
    const clearedFilters: CouponFilters = {};
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const handleClearAll = () => {
    setLocalSearchQuery('');
    onSearchChange('');
    handleClearFilters();
  };

  // Count active filters
  const activeFilterCount = Object.values(localFilters).filter(
    value => value !== undefined && value !== null && value !== ''
  ).length;

  // Check if any filters or search are active
  const hasActiveFilters = activeFilterCount > 0 || localSearchQuery.trim() !== '';

  return (
    <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
        {/* Search Bar */}
        <Box sx={{ mb: showFilters ? 2 : 0 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs>
              <TextField
                fullWidth
                placeholder="Search coupons by code or description..."
                value={localSearchQuery}
                onChange={handleSearchChange}
                disabled={isLoading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: localSearchQuery && (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={handleClearSearch}
                        disabled={isLoading}
                        aria-label="Clear search"
                      >
                        <ClearIcon />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                data-testid="search-input"
              />
            </Grid>
            <Grid item>
              <IconButton
                onClick={() => setShowFilters(!showFilters)}
                color={activeFilterCount > 0 ? 'primary' : 'default'}
                aria-label="Toggle filters"
                data-testid="filter-toggle"
              >
                <FilterIcon />
                {showFilters ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Grid>
          </Grid>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography variant="body2" color="text.secondary">
                Active filters:
              </Typography>
              {localSearchQuery && (
                <Chip
                  label={`Search: "${localSearchQuery}"`}
                  size="small"
                  onDelete={handleClearSearch}
                  color="primary"
                  variant="outlined"
                />
              )}
              {localFilters.status && (
                <Chip
                  label={`Status: ${localFilters.status}`}
                  size="small"
                  onDelete={() => handleFilterChange('status', '')}
                  color="primary"
                  variant="outlined"
                />
              )}
              {localFilters.discountType && (
                <Chip
                  label={`Type: ${localFilters.discountType}`}
                  size="small"
                  onDelete={() => handleFilterChange('discountType', '')}
                  color="primary"
                  variant="outlined"
                />
              )}
              {(localFilters.expirationStart || localFilters.expirationEnd) && (
                <Chip
                  label="Date range"
                  size="small"
                  onDelete={() => {
                    handleFilterChange('expirationStart', '');
                    handleFilterChange('expirationEnd', '');
                  }}
                  color="primary"
                  variant="outlined"
                />
              )}
              {(localFilters.minValue !== undefined || localFilters.maxValue !== undefined) && (
                <Chip
                  label="Value range"
                  size="small"
                  onDelete={() => {
                    handleFilterChange('minValue', undefined);
                    handleFilterChange('maxValue', undefined);
                  }}
                  color="primary"
                  variant="outlined"
                />
              )}
              <Chip
                label="Clear all"
                size="small"
                onClick={handleClearAll}
                color="secondary"
                variant="outlined"
                clickable
              />
            </Box>
          )}

          {/* Results Count */}
          {resultCount !== undefined && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {resultCount === 0 ? 'No results found' : `${resultCount} result${resultCount !== 1 ? 's' : ''} found`}
                {localSearchQuery && ` for "${localSearchQuery}"`}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Filters Panel */}
        <Collapse in={showFilters}>
          <Box sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Grid container spacing={2}>
              {/* Status Filter */}
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={localFilters.status || ''}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    label="Status"
                    data-testid="status-filter"
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="expired">Expired</MenuItem>
                    <MenuItem value="used">Used</MenuItem>
                    <MenuItem value="disabled">Disabled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Discount Type Filter */}
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Discount Type</InputLabel>
                  <Select
                    value={localFilters.discountType || ''}
                    onChange={(e) => handleFilterChange('discountType', e.target.value)}
                    label="Discount Type"
                    data-testid="discount-type-filter"
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="amount">Amount</MenuItem>
                    <MenuItem value="percentage">Percentage</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Expiration Date Range */}
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Expires From"
                  type="date"
                  value={localFilters.expirationStart || ''}
                  onChange={(e) => handleFilterChange('expirationStart', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  data-testid="expiration-start-filter"
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Expires To"
                  type="date"
                  value={localFilters.expirationEnd || ''}
                  onChange={(e) => handleFilterChange('expirationEnd', e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  data-testid="expiration-end-filter"
                />
              </Grid>

              {/* Value Range */}
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Min Value"
                  type="number"
                  value={localFilters.minValue || ''}
                  onChange={(e) => handleFilterChange('minValue', e.target.value ? Number(e.target.value) : undefined)}
                  inputProps={{ min: 0, step: 0.01 }}
                  data-testid="min-value-filter"
                />
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Max Value"
                  type="number"
                  value={localFilters.maxValue || ''}
                  onChange={(e) => handleFilterChange('maxValue', e.target.value ? Number(e.target.value) : undefined)}
                  inputProps={{ min: 0, step: 0.01 }}
                  data-testid="max-value-filter"
                />
              </Grid>
            </Grid>

            {/* Filter Actions */}
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <IconButton
                size="small"
                onClick={handleClearFilters}
                disabled={activeFilterCount === 0}
                aria-label="Clear filters"
                data-testid="clear-filters"
              >
                <ClearIcon />
              </IconButton>
            </Box>
          </Box>
        </Collapse>
      </Paper>
    );
};

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

export default CouponSearch;