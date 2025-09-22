// Textarea Component
import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils/className';

export const Textarea = forwardRef(({
  className,
  label,
  error,
  helper,
  rows = 4,
  ...props
}, ref) => {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-red-500 focus:ring-red-500',
          className
        )}
        rows={rows}
        ref={ref}
        {...props}
      />
      {helper && (
        <p className="text-sm text-gray-600">{helper}</p>
      )}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
});