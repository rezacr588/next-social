// Modal Component
import React, { useEffect } from 'react';
import { cn } from '../../lib/utils/className';
import { Button } from './Button';

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'default',
  className
}) => {
  const sizeClasses = {
    sm: 'max-w-md',
    default: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full',
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={cn(
        'relative bg-white rounded-lg shadow-xl w-full mx-4',
        sizeClasses[size],
        className
      )}>
        {title && (
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-lg font-semibold">{title}</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-6 w-6"
            >
              ×
            </Button>
          </div>
        )}
        <div className="p-6">
          {children}
        </div>
        {footer && (
          <div className="flex justify-end space-x-2 p-6 border-t">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};