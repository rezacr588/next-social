// Alert Component
import React from 'react';
import { cn } from '../../lib/utils/className';

const alertVariants = {
  variant: {
    default: 'bg-blue-50 text-blue-900 border-blue-200',
    destructive: 'bg-red-50 text-red-900 border-red-200',
    success: 'bg-green-50 text-green-900 border-green-200',
    warning: 'bg-yellow-50 text-yellow-900 border-yellow-200',
  },
};

export const Alert = ({
  className,
  variant = 'default',
  children,
  ...props
}) => (
  <div
    role="alert"
    className={cn(
      'relative w-full rounded-lg border p-4',
      alertVariants.variant[variant],
      className
    )}
    {...props}
  >
    {children}
  </div>
);

export const AlertTitle = ({
  className,
  children,
  ...props
}) => (
  <h5
    className={cn('mb-1 font-medium leading-none tracking-tight', className)}
    {...props}
  >
    {children}
  </h5>
);

export const AlertDescription = ({
  className,
  children,
  ...props
}) => (
  <div
    className={cn('text-sm [&_p]:leading-relaxed', className)}
    {...props}
  >
    {children}
  </div>
);