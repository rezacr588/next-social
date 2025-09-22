import React from 'react';

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className = '', 
  disabled = false,
  ...props 
}) => {
  const baseClasses = 'px-4 py-2 rounded-lg transition-colors duration-300 button-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-pink-500';
  
  const variants = {
    primary: 'bg-pink-600 hover:bg-pink-700 text-white',
    secondary: 'bg-gray-700 hover:bg-gray-600 text-white',
    ghost: 'bg-transparent hover:bg-gray-800 text-gray-300',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  };
  
  const disabledClasses = 'opacity-50 cursor-not-allowed';
  
  return (
    <button 
      className={`${baseClasses} ${variants[variant]} ${disabled ? disabledClasses : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
