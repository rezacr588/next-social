import React, { useState } from 'react';
import Button from './ui/Button';

const EthicalControls = () => {
  const [usageTime, setUsageTime] = useState(60); // minutes remaining
  
  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center bg-gray-800 px-3 py-1 rounded-full">
        <span className="text-sm mr-2">⏱️</span>
        <span className="font-medium">{usageTime}m</span>
      </div>
      <Button variant="primary">
        Pause Session
      </Button>
    </div>
  );
};

export default EthicalControls;
