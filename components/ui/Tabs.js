// Tabs Component
import React, { useState, createContext, useContext } from 'react';
import { cn } from '../../lib/utils/className';

const TabsContext = createContext();

export const Tabs = ({ defaultValue, value, onValueChange, children, className }) => {
  const [activeTab, setActiveTab] = useState(defaultValue);
  
  const currentValue = value !== undefined ? value : activeTab;
  
  const handleValueChange = (newValue) => {
    if (value === undefined) {
      setActiveTab(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
      <div className={cn('w-full', className)}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

export const TabsList = ({ children, className }) => (
  <div className={cn(
    'inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1 text-gray-500',
    className
  )}>
    {children}
  </div>
);

export const TabsTrigger = ({ value, children, className, disabled }) => {
  const { value: activeValue, onValueChange } = useContext(TabsContext);
  const isActive = activeValue === value;

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        isActive 
          ? 'bg-white text-gray-950 shadow-sm' 
          : 'text-gray-600 hover:text-gray-900',
        className
      )}
      onClick={() => onValueChange(value)}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export const TabsContent = ({ value, children, className }) => {
  const { value: activeValue } = useContext(TabsContext);
  
  if (activeValue !== value) return null;

  return (
    <div className={cn(
      'mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
      className
    )}>
      {children}
    </div>
  );
};