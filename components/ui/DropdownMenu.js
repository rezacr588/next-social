// Dropdown Menu Component
import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils/className';

export const DropdownMenu = ({ children, trigger, align = 'left' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const alignmentClasses = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 transform -translate-x-1/2',
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      {isOpen && (
        <div className={cn(
          'absolute z-50 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5',
          alignmentClasses[align]
        )}>
          <div className="py-1" role="menu">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

export const DropdownMenuItem = ({ 
  children, 
  onClick, 
  disabled = false,
  className,
  ...props 
}) => (
  <button
    className={cn(
      'block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900',
      disabled && 'opacity-50 cursor-not-allowed',
      className
    )}
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
    role="menuitem"
    {...props}
  >
    {children}
  </button>
);

export const DropdownMenuSeparator = ({ className }) => (
  <div className={cn('my-1 h-px bg-gray-100', className)} />
);