// Checkbox Component
import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils/className';

export const Checkbox = forwardRef(({
  className,
  label,
  error,
  helper,
  ...props
}, ref) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          className={cn(
            'h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2',
            error && 'border-red-500',
            className
          )}
          ref={ref}
          {...props}
        />
        {label && (
          <label className="text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
      </div>
      {helper && (
        <p className="text-sm text-gray-600">{helper}</p>
      )}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
});