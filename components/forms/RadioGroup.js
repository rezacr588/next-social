// Radio Group Component
import React, { createContext, useContext } from 'react';
import { cn } from '../../lib/utils/className';

const RadioGroupContext = createContext();

export const RadioGroup = ({ 
  value, 
  onValueChange, 
  children, 
  className,
  label,
  error,
  ...props 
}) => {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange }}>
      <div className="space-y-2">
        {label && (
          <label className="text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <div className={cn('space-y-2', className)} {...props}>
          {children}
        </div>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    </RadioGroupContext.Provider>
  );
};

export const RadioGroupItem = ({ 
  value, 
  children, 
  className,
  disabled,
  ...props 
}) => {
  const context = useContext(RadioGroupContext);
  if (!context) {
    throw new Error('RadioGroupItem must be used within RadioGroup');
  }
  
  const { value: groupValue, onValueChange } = context;
  const isSelected = groupValue === value;

  return (
    <div className="flex items-center space-x-2">
      <input
        type="radio"
        className={cn(
          'h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2',
          className
        )}
        checked={isSelected}
        onChange={() => onValueChange?.(value)}
        disabled={disabled}
        {...props}
      />
      <label className="text-sm text-gray-700">
        {children}
      </label>
    </div>
  );
};