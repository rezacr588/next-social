// Badge Component
import React from 'react';
import { cn } from '../../lib/utils/className';

const badgeVariants = {
  variant: {
    default: 'bg-blue-100 text-blue-800 border-blue-200',
    secondary: 'bg-gray-100 text-gray-800 border-gray-200',
    destructive: 'bg-red-100 text-red-800 border-red-200',
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    outline: 'text-gray-600 border-gray-300',
  },
  size: {
    sm: 'px-2 py-1 text-xs',
    default: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-base',
  },
};

export const Badge = ({
  className,
  variant = 'default',
  size = 'default',
  children,
  ...props
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        badgeVariants.variant[variant],
        badgeVariants.size[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};