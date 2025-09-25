import { cn } from '@/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  message?: string;
}

const LoadingSpinner = ({ size = 'md', className, message }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className={cn('spinner', sizeClasses[size])} />
      {message && <p className="text-sm text-gray-600">{message}</p>}
    </div>
  );
};

export default LoadingSpinner;