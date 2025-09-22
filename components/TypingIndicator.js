import React from 'react';

export default function TypingIndicator({ users }) {
  if (!users || users.length === 0) return null;

  return (
    <div className="flex items-center mb-2 text-gray-400 text-sm">
      <div className="flex space-x-1 mr-2">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '600ms' }} />
      </div>
      <span>
        {users.length > 1 
          ? `${users.slice(0, -1).join(', ')} and ${users[users.length - 1]} are typing...`
          : `${users[0]} is typing...`}
      </span>
    </div>
  );
}
