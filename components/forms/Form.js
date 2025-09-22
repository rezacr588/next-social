// Form wrapper with context
import React, { createContext, useContext, useState } from 'react';
import { cn } from '../../lib/utils/className';

const FormContext = createContext();

export const Form = ({ children, onSubmit, className, ...props }) => {
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit?.(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const setFieldError = (field, error) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const clearFieldError = (field) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  return (
    <FormContext.Provider value={{
      errors,
      isSubmitting,
      setFieldError,
      clearFieldError,
    }}>
      <form
        onSubmit={handleSubmit}
        className={cn('space-y-4', className)}
        {...props}
      >
        {children}
      </form>
    </FormContext.Provider>
  );
};

export const useFormContext = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within a Form component');
  }
  return context;
};