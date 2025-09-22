import React from 'react';

const PresenceIndicator = () => {
  // Mock presence indicator for testing
  return (
    <div className="fixed top-4 right-4 bg-gray-800 rounded-lg p-4 shadow-lg">
      <div className="flex items-center space-x-2">
        <div className="w-3 h-3 rounded-full bg-green-400" />
        <span className="text-sm text-gray-300">
          Connected
        </span>
      </div>
      <div className="mt-2 text-sm text-gray-400">
        1 user online
      </div>
    </div>
  );
};

export default PresenceIndicator;
