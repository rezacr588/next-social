import React, { useState, useEffect } from 'react';
import { useRealtime } from '../hooks/useRealtime';
import TypingIndicator from './TypingIndicator';

const ChatRoom = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const { socket, isConnected, joinRoom, leaveRoom, sendMessage } = useRealtime();
  const [isJoined, setIsJoined] = useState(false);

  useEffect(() => {
    if (socket && isConnected && isJoined) {
      joinRoom('general-chat');

      const handleMessage = (message) => {
        setMessages(prev => [...prev, message]);
      };

      socket.on('new-message', handleMessage);

      const handleTypingUpdate = ({ typingUsers }) => {
        setTypingUsers(typingUsers);
      };

      socket.on('typing-update', handleTypingUpdate);

      return () => {
        socket.off('new-message', handleMessage);
        socket.off('typing-update', handleTypingUpdate);
        leaveRoom('general-chat');
      };
    }
  }, [socket, isConnected, isJoined, joinRoom, leaveRoom]);

  const handleJoin = () => {
    setIsJoined(true);
  };

  const handleLeave = () => {
    setIsJoined(false);
    setMessages([]);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() && isJoined) {
      sendMessage({
        roomId: 'general-chat',
        content: newMessage,
        type: 'chat'
      });
      setNewMessage('');
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);

    if (value.length > 0) {
      socket.emit('typing-start', 'general-chat');
    } else {
      socket.emit('typing-stop', 'general-chat');
    }
  };

  return (
    <div className="neumorphic p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4">General Chat</h2>

      {!isJoined ? (
        <div className="text-center">
          <p className="text-gray-400 mb-4">Join the chat room to start messaging</p>
          <button
            onClick={handleJoin}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors"
          >
            Join Chat
          </button>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-gray-400">Connected to chat room</span>
            <button
              onClick={handleLeave}
              className="px-4 py-1 bg-red-600 hover:bg-red-700 rounded text-white text-sm"
            >
              Leave
            </button>
          </div>

          <div className="h-64 overflow-y-auto bg-gray-800 rounded p-4 mb-4 space-y-2">
            {messages.map((msg, index) => (
              <div key={index} className="text-sm">
                <span className="text-purple-400 font-medium">
                  {msg.sender || 'Anonymous'}:
                </span>
                <span className="text-white ml-2">{msg.content}</span>
                <span className="text-gray-500 text-xs ml-2">
                  {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}
                </span>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-gray-700">
            <TypingIndicator users={typingUsers} />
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                placeholder="Type a message..."
                className="flex-1 p-2 bg-gray-800 rounded border border-gray-600 text-white"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-white"
              >
                Send
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatRoom;
