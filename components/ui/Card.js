import React from 'react';

const Card = ({ children, className = '' }) => {
  return (
    <div className={`neumorphic p-6 transition-transform duration-300 hover:scale-[1.02] ${className}`}>
      {children}
    </div>
  );
};

export default Card;
