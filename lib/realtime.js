import { Server } from 'socket.io';

let io;

// State management
const userStates = new Map(); // { userId: { status, lastActive, socketId } }
const rooms = new Map(); // { roomId: Set<socketId> }
const messageQueues = new Map(); // { userId: Array<message> }
const typingUsers = new Map(); // { roomId: Set<userId> }
const typingUsersMap = new Map(); // { roomId: Set<userId> }

const initRealtime = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
      skipMiddlewares: true,
    }
  });

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Authentication handler
    socket.on('authenticate', ({ userId }) => {
      if (!userId) return;

      // Update user state
      userStates.set(userId, {
        status: 'online',
        lastActive: new Date(),
        socketId: socket.id
      });

      // Join default room
      joinRoom(socket, 'global');

      // Deliver queued messages
      deliverQueuedMessages(userId, socket);

      // Broadcast presence update
      io.emit('presence-update', {
        userId,
        status: 'online'
      });
    });

    // Room management
    socket.on('join-room', (roomId) => {
      joinRoom(socket, roomId);
    });

    socket.on('leave-room', (roomId) => {
      leaveRoom(socket, roomId);
    });

    // Message handling
    socket.on('send-message', (message) => {
      handleMessage(socket, message);
    });

    // Typing indicators
    socket.on('typing-start', (roomId) => {
      const userId = getUserIdBySocket(socket.id);
      if (!userId) return;

      if (!typingUsers.has(roomId)) {
        typingUsers.set(roomId, new Set());
      }
      typingUsers.get(roomId).add(userId);
      
      // Broadcast typing event
      io.to(roomId).emit('typing-update', {
        roomId,
        typingUsers: Array.from(typingUsers.get(roomId))
      });
    });

    socket.on('typing-stop', (roomId) => {
      const userId = getUserIdBySocket(socket.id);
      if (!userId || !typingUsers.has(roomId)) return;

      typingUsers.get(roomId).delete(userId);
      
      // Broadcast typing update
      io.to(roomId).emit('typing-update', {
        roomId,
        typingUsers: Array.from(typingUsers.get(roomId))
      });
    });

    // Status updates
    socket.on('update-status', (status) => {
      updateUserStatus(socket, status);
    });

    socket.on('disconnect', () => {
      handleDisconnect(socket);
    });

    // Error handling
    socket.on('error', (error) => {
      console.error(`Socket error (${socket.id}):`, error);
    });
  });

  return io;
};

// Helper functions
function joinRoom(socket, roomId) {
  socket.join(roomId);
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }
  rooms.get(roomId).add(socket.id);
  console.log(`Socket ${socket.id} joined room ${roomId}`);
}

function leaveRoom(socket, roomId) {
  socket.leave(roomId);
  if (rooms.has(roomId)) {
    rooms.get(roomId).delete(socket.id);
    if (rooms.get(roomId).size === 0) {
      rooms.delete(roomId);
    }
  }
  console.log(`Socket ${socket.id} left room ${roomId}`);
}

function handleMessage(socket, message) {
  const { roomId, content } = message;

  // Validate room membership
  if (!rooms.has(roomId) || !rooms.get(roomId).has(socket.id)) {
    socket.emit('error', 'Not a member of this room');
    return;
  }

  // Broadcast to room
  io.to(roomId).emit('new-message', {
    ...message,
    timestamp: new Date(),
    sender: getUserIdBySocket(socket.id)
  });
}

function updateUserStatus(socket, status) {
  const userId = getUserIdBySocket(socket.id);
  if (!userId) return;

  const userState = userStates.get(userId) || {};
  userStates.set(userId, {
    ...userState,
    status,
    lastActive: new Date()
  });

  io.emit('presence-update', { userId, status });
}

function handleDisconnect(socket) {
  console.log(`Client disconnected: ${socket.id}`);

  const userId = getUserIdBySocket(socket.id);
  if (userId) {
    const userState = userStates.get(userId) || {};
    userStates.set(userId, {
      ...userState,
      status: 'offline',
      lastActive: new Date()
    });

    io.emit('presence-update', { userId, status: 'offline' });
  }
}

function deliverQueuedMessages(userId, socket) {
  if (messageQueues.has(userId)) {
    const queue = messageQueues.get(userId);
    queue.forEach(msg => {
      socket.emit('queued-message', msg);
    });
    messageQueues.delete(userId);
  }
}

function getUserIdBySocket(socketId) {
  for (const [userId, state] of userStates.entries()) {
    if (state.socketId === socketId) {
      return userId;
    }
  }
  return null;
}

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

export { initRealtime, getIO, userStates };
