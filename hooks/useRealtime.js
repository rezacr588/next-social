import { useEffect, useRef, useState, useCallback } from 'react';

export const useRealtime = () => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [presence, setPresence] = useState(new Map());
  const [userCount, setUserCount] = useState(0);
  const listenersRef = useRef(new Map());
  const typingRoomsRef = useRef(new Map());

  const emitEvent = useCallback((event, payload) => {
    const listeners = listenersRef.current.get(event);
    if (!listeners) return;
    listeners.forEach((cb) => cb(payload));
  }, []);

  const updateTypingRoom = useCallback(
    (roomId, isTyping, userId = 'guest') => {
      const room = typingRoomsRef.current.get(roomId) || new Set();
      if (isTyping) {
        room.add(userId);
      } else {
        room.delete(userId);
      }
      typingRoomsRef.current.set(roomId, room);
      emitEvent('typing-update', {
        roomId,
        typingUsers: Array.from(room),
      });
    },
    [emitEvent]
  );

  useEffect(() => {
    // Mock realtime functionality for testing
    setIsConnected(true);
    setUserCount(1);

    const mockSocket = {
      on: (event, handler) => {
        if (!listenersRef.current.has(event)) {
          listenersRef.current.set(event, new Set());
        }
        listenersRef.current.get(event).add(handler);
      },
      off: (event, handler) => {
        const handlers = listenersRef.current.get(event);
        if (!handlers) return;
        handlers.delete(handler);
        if (handlers.size === 0) {
          listenersRef.current.delete(event);
        }
      },
      emit: (event, payload) => {
        if (event === 'typing-start') {
          updateTypingRoom(payload, true);
          return;
        }
        if (event === 'typing-stop') {
          updateTypingRoom(payload, false);
          return;
        }
        emitEvent(event, payload);
      },
      disconnect: () => {
        listenersRef.current.clear();
        typingRoomsRef.current.clear();
      }
    };

    setSocket(mockSocket);

    return () => {
      mockSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [emitEvent, updateTypingRoom]);

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
    emitEvent('new-message', {
      ...message,
      sender: 'You',
      timestamp: new Date().toISOString(),
    });
    updateTypingRoom(message.roomId, false);
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
