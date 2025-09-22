import { useEffect, useState } from 'react';

export const useRealtime = () => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [presence, setPresence] = useState(new Map());
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    // Mock realtime functionality for testing
    setIsConnected(true);
    setUserCount(1);

    // Simulate socket connection
    const mockSocket = {
      on: () => {},
      off: () => {},
      emit: () => {},
      disconnect: () => {}
    };

    setSocket(mockSocket);

    return () => {
      // Cleanup
    };
  }, []);

  // Mock room management
  const joinRoom = (roomId) => {
    console.log(`Mock: Joining room ${roomId}`);
  };

  const leaveRoom = (roomId) => {
    console.log(`Mock: Leaving room ${roomId}`);
  };

  // Mock message sending
  const sendMessage = (message) => {
    console.log('Mock: Sending message', message);
  };

  // Mock status updates
  const updateStatus = (status) => {
    console.log(`Mock: Updating status to ${status}`);
  };

  return {
    socket,
    isConnected,
    presence,
    userCount,
    joinRoom,
    leaveRoom,
    sendMessage,
    updateStatus
  };
};
