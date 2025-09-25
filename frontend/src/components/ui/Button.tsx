import React from 'react';
import { ButtonProps } from '@/types';
import { cn } from '@/utils';

const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className,
  onClick,
  asChild = false,
  ...props
}: ButtonProps) => {
  const baseClasses = 'btn';
  
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    outline: 'btn-outline',
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  const buttonClasses = cn(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className
  );

  if (asChild) {
    // When asChild is true, apply classes to the child element
    const child = children as React.ReactElement;
    return React.cloneElement(child, {
      className: cn(child.props.className, buttonClasses),
    });
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={buttonClasses}
      {...props}
    >
      {loading && <span className="spinner" />}
      {children}
    </button>
  );
};

export default Button;