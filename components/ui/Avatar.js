import React from 'react';

const Avatar = ({ src, alt, size = 'md' }) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };
  
  return (
    <div className={`${sizes[size]} rounded-full overflow-hidden bg-gray-200 border-2 border-dashed`}>
      {src ? (
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-500">
          {alt ? alt[0].toUpperCase() : 'U'}
        </div>
      )}
    </div>
  );
};

export default Avatar;
