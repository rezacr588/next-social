import React, { useState, useEffect } from 'react';

const NotificationSystem = () => {
  const [notifications, setNotifications] = useState([]);

  // Mock notification system for testing
  useEffect(() => {
    // Simulate a notification after 2 seconds
    const timer = setTimeout(() => {
      setNotifications([{
        id: Date.now(),
        type: 'info',
        message: 'Welcome to Nexus!',
        timestamp: new Date()
      }]);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg shadow-lg max-w-sm"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm">{notification.message}</p>
              <p className="text-xs opacity-75">
                {notification.timestamp.toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="ml-2 text-white hover:text-gray-200"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationSystem;
