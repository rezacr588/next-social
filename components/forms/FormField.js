// Form Field Component
import React from 'react';
import { useFormContext } from './Form';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { cn } from '../../lib/utils/className';

export const FormField = ({
  name,
  label,
  type = 'text',
  component = 'input',
  validation,
  className,
  ...props
}) => {
  const { errors, setFieldError, clearFieldError } = useFormContext();
  
  const handleChange = (e) => {
    const value = e.target.value;
    
    // Clear existing error when user starts typing
    if (errors[name]) {
      clearFieldError(name);
    }
    
    // Run validation if provided
    if (validation) {
      const result = validation(value);
      if (!result.isValid) {
        setFieldError(name, result.error);
      }
    }
    
    props.onChange?.(e);
  };

  const error = errors[name];
  
  const commonProps = {
    name,
    label,
    error,
    onChange: handleChange,
    className,
    ...props,
  };

  if (component === 'textarea') {
    return <Textarea {...commonProps} />;
  }

  return <Input type={type} {...commonProps} />;
};