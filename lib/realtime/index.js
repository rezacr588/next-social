// lib/realtime/index.js - Advanced Real-time Messaging System
const { Server } = require('socket.io');
const { logger } = require('../logger.js');
const { verifyToken } = require('../auth.js');
const { databaseManager } = require('../database/index.js');
const { memoize, debounce } = require('../utils/index.js');

class RealtimeManager {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId mapping
    this.userRooms = new Map(); // userId -> Set of roomIds
    this.roomUsers = new Map(); // roomId -> Set of userIds
    this.messageQueues = new Map(); // userId -> Array of queued messages
    this.typingUsers = new Map(); // roomId -> Map of typing users
    this.onlineStatus = new Map(); // userId -> { status, lastSeen, deviceInfo }

    // Performance optimizations
    this.userCountCache = new Map();
    this.roomCountCache = new Map();

    this.initializeEventHandlers();
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true
      },
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000,
        skipMiddlewares: true,
      },
      transports: ['websocket', 'polling'],
      upgradeTimeout: 10000,
      pingTimeout: 60000,
      pingInterval: 25000,
      maxHttpBufferSize: 1e8,
      allowEIO3: true
    });

    this.setupMiddleware();
    this.setupConnectionHandlers();
    this.initializeRooms();

    logger.info('Realtime server initialized with advanced features');
    return this.io;
  }

  setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = verifyToken(token);
        socket.userId = decoded.id;
        socket.userRole = decoded.role;
        socket.deviceId = socket.handshake.query.deviceId || 'unknown';

        // Track user connection
        this.trackUserConnection(socket.userId, socket.id, {
          userAgent: socket.handshake.headers['user-agent'],
          ip: socket.handshake.address,
          deviceId: socket.deviceId
        });

        next();
      } catch (error) {
        logger.error('Socket authentication failed', { error: error.message, socketId: socket.id });
        next(new Error('Authentication failed'));
      }
    });
  }

  setupConnectionHandlers() {
    this.io.on('connection', (socket) => {
      logger.info('User connected to realtime system', {
        userId: socket.userId,
        socketId: socket.id,
        deviceId: socket.deviceId
      });

      this.handleUserConnection(socket);
      this.handleMessageEvents(socket);
      this.handleRoomEvents(socket);
      this.handleTypingEvents(socket);
      this.handleStatusEvents(socket);
      this.handleDisconnect(socket);
    });
  }

  initializeRooms() {
    // Create default rooms
    const defaultRooms = ['general', 'announcements', 'help', 'random'];

    defaultRooms.forEach(roomId => {
      this.roomUsers.set(roomId, new Set());
    });

    logger.info('Default rooms initialized', { rooms: defaultRooms });
  }

  // User Connection Management
  handleUserConnection(socket) {
    const { userId, socketId } = socket;

    // Update user's online status
    this.updateUserStatus(userId, 'online', {
      socketId,
      deviceId: socket.deviceId,
      connectedAt: new Date()
    });

    // Join user to their personal room for direct messages
    socket.join(`user_${userId}`);

    // Join user to default rooms
    this.joinRoom(socket, 'general');

    // Send welcome message with system info
    socket.emit('system:welcome', {
      userId,
      socketId,
      timestamp: new Date(),
      serverInfo: {
        version: '2.0.0',
        features: ['typing-indicators', 'message-history', 'file-sharing', 'reactions']
      }
    });

    // Send queued messages
    this.deliverQueuedMessages(userId, socket);

    // Broadcast user online status
    this.broadcastPresenceUpdate(userId, 'online');
  }

  // Message Event Handlers
  handleMessageEvents(socket) {
    // Handle text messages
    socket.on('message:send', async (data) => {
      await this.handleSendMessage(socket, data);
    });

    // Handle message reactions
    socket.on('message:react', async (data) => {
      await this.handleMessageReaction(socket, data);
    });

    // Handle message editing
    socket.on('message:edit', async (data) => {
      await this.handleEditMessage(socket, data);
    });

    // Handle message deletion
    socket.on('message:delete', async (data) => {
      await this.handleDeleteMessage(socket, data);
    });

    // Handle file uploads
    socket.on('message:file', async (data) => {
      await this.handleFileUpload(socket, data);
    });
  }

  // Room Event Handlers
  handleRoomEvents(socket) {
    socket.on('room:join', (roomId) => {
      this.joinRoom(socket, roomId);
    });

    socket.on('room:leave', (roomId) => {
      this.leaveRoom(socket, roomId);
    });

    socket.on('room:create', async (data) => {
      await this.createRoom(socket, data);
    });

    socket.on('room:invite', async (data) => {
      await this.inviteToRoom(socket, data);
    });
  }

  // Typing Event Handlers
  handleTypingEvents(socket) {
    socket.on('typing:start', (data) => {
      this.handleTypingStart(socket, data);
    });

    socket.on('typing:stop', () => {
      this.handleTypingStop(socket);
    });
  }

  // Status Event Handlers
  handleStatusEvents(socket) {
    socket.on('status:update', (status) => {
      this.updateUserStatus(socket.userId, status, {
        lastActivity: new Date()
      });
    });

    socket.on('status:away', () => {
      this.updateUserStatus(socket.userId, 'away');
    });

    socket.on('status:busy', () => {
      this.updateUserStatus(socket.userId, 'busy');
    });
  }

  // Disconnect Handler
  handleDisconnect(socket) {
    socket.on('disconnect', (reason) => {
      logger.info('User disconnected from realtime system', {
        userId: socket.userId,
        socketId: socket.id,
        reason
      });

      this.handleUserDisconnection(socket.userId, socket.id, reason);
    });
  }

  // Advanced Message Handling
  async handleSendMessage(socket, data) {
    try {
      const { roomId, content, messageType = 'text', metadata = {} } = data;

      // Validate message
      if (!this.validateMessage(content, messageType)) {
        socket.emit('message:error', { error: 'Invalid message content' });
        return;
      }

      // Check if user is in the room
      if (!this.isUserInRoom(socket.userId, roomId)) {
        socket.emit('message:error', { error: 'Not authorized to send to this room' });
        return;
      }

      const message = {
        id: this.generateMessageId(),
        userId: socket.userId,
        roomId,
        content: this.sanitizeMessage(content),
        messageType,
        metadata,
        timestamp: new Date(),
        edited: false,
        reactions: {},
        replyTo: metadata.replyTo
      };

      // Save to database (mock implementation)
      await this.saveMessageToDatabase(message);

      // Broadcast to room
      this.io.to(roomId).emit('message:new', message);

      // Send confirmation to sender
      socket.emit('message:sent', { messageId: message.id, timestamp: message.timestamp });

      // Handle mentions
      await this.processMessageMentions(message);

      // Update room activity
      await this.updateRoomActivity(roomId);

      logger.debug('Message sent successfully', { messageId: message.id, roomId });
    } catch (error) {
      logger.error('Error sending message', { error, userId: socket.userId });
      socket.emit('message:error', { error: 'Failed to send message' });
    }
  }

  // Message Reaction Handling
  async handleMessageReaction(socket, data) {
    try {
      const { messageId, reaction } = data;

      // Validate reaction
      if (!this.isValidReaction(reaction)) {
        socket.emit('reaction:error', { error: 'Invalid reaction' });
        return;
      }

      // Update message reactions in database
      const updatedMessage = await this.updateMessageReaction(messageId, socket.userId, reaction);

      // Broadcast reaction update
      this.io.emit('message:reaction', {
        messageId,
        userId: socket.userId,
        reaction,
        message: updatedMessage
      });

      logger.debug('Message reaction added', { messageId, userId: socket.userId, reaction });
    } catch (error) {
      logger.error('Error adding reaction', { error, userId: socket.userId });
      socket.emit('reaction:error', { error: 'Failed to add reaction' });
    }
  }

  // Message Editing
  async handleEditMessage(socket, data) {
    try {
      const { messageId, newContent } = data;

      // Check if user owns the message
      const message = await this.getMessageById(messageId);

      if (!message || message.userId !== socket.userId) {
        socket.emit('edit:error', { error: 'Unauthorized to edit this message' });
        return;
      }

      // Update message
      const updatedMessage = await this.updateMessage(messageId, {
        content: this.sanitizeMessage(newContent),
        edited: true,
        editedAt: new Date()
      });

      // Broadcast update
      this.io.to(message.roomId).emit('message:edited', {
        messageId,
        newContent: updatedMessage.content,
        editedAt: updatedMessage.editedAt
      });

      logger.debug('Message edited successfully', { messageId, userId: socket.userId });
    } catch (error) {
      logger.error('Error editing message', { error, userId: socket.userId });
      socket.emit('edit:error', { error: 'Failed to edit message' });
    }
  }

  // Message Deletion
  async handleDeleteMessage(socket, data) {
    try {
      const { messageId } = data;

      const message = await this.getMessageById(messageId);

      if (!message || message.userId !== socket.userId) {
        socket.emit('delete:error', { error: 'Unauthorized to delete this message' });
        return;
      }

      // Delete message
      await this.deleteMessage(messageId);

      // Broadcast deletion
      this.io.to(message.roomId).emit('message:deleted', {
        messageId,
        deletedBy: socket.userId
      });

      logger.debug('Message deleted successfully', { messageId, userId: socket.userId });
    } catch (error) {
      logger.error('Error deleting message', { error, userId: socket.userId });
      socket.emit('delete:error', { error: 'Failed to delete message' });
    }
  }

  // File Upload Handling
  async handleFileUpload(socket, data) {
    try {
      const { file, roomId } = data;

      // Validate file
      if (!this.validateFile(file)) {
        socket.emit('file:error', { error: 'Invalid file' });
        return;
      }

      // Process file upload
      const fileInfo = await this.processFileUpload(file, socket.userId);

      // Create file message
      const message = {
        id: this.generateMessageId(),
        userId: socket.userId,
        roomId,
        messageType: 'file',
        content: fileInfo.name,
        metadata: {
          file: fileInfo,
          uploadedAt: new Date()
        },
        timestamp: new Date()
      };

      // Save and broadcast
      await this.saveMessageToDatabase(message);
      this.io.to(roomId).emit('message:file', message);

      logger.debug('File uploaded successfully', { fileId: fileInfo.id, userId: socket.userId });
    } catch (error) {
      logger.error('Error uploading file', { error, userId: socket.userId });
      socket.emit('file:error', { error: 'Failed to upload file' });
    }
  }

  // Room Management
  joinRoom(socket, roomId) {
    socket.join(roomId);

    if (!this.roomUsers.has(roomId)) {
      this.roomUsers.set(roomId, new Set());
    }

    this.roomUsers.get(roomId).add(socket.userId);

    if (!this.userRooms.has(socket.userId)) {
      this.userRooms.set(socket.userId, new Set());
    }

    this.userRooms.get(socket.userId).add(roomId);

    // Send room history
    this.sendRoomHistory(socket, roomId);

    // Notify room members
    socket.to(roomId).emit('room:user-joined', {
      userId: socket.userId,
      roomId,
      timestamp: new Date()
    });

    logger.debug('User joined room', { userId: socket.userId, roomId });
  }

  leaveRoom(socket, roomId) {
    socket.leave(roomId);

    if (this.roomUsers.has(roomId)) {
      this.roomUsers.get(roomId).delete(socket.userId);
    }

    if (this.userRooms.has(socket.userId)) {
      this.userRooms.get(socket.userId).delete(roomId);
    }

    socket.to(roomId).emit('room:user-left', {
      userId: socket.userId,
      roomId,
      timestamp: new Date()
    });

    logger.debug('User left room', { userId: socket.userId, roomId });
  }

  async createRoom(socket, data) {
    try {
      const { roomName, roomType = 'public', description = '' } = data;

      if (!roomName || roomName.length < 3) {
        socket.emit('room:error', { error: 'Room name must be at least 3 characters' });
        return;
      }

      const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create room in database
      await this.createRoomInDatabase({
        id: roomId,
        name: roomName,
        type: roomType,
        description,
        createdBy: socket.userId,
        createdAt: new Date()
      });

      // Initialize room
      this.roomUsers.set(roomId, new Set([socket.userId]));
      this.userRooms.set(socket.userId, new Set([roomId]));

      // Join creator to room
      socket.join(roomId);

      socket.emit('room:created', {
        roomId,
        roomName,
        roomType,
        description
      });

      logger.info('Room created successfully', { roomId, roomName, createdBy: socket.userId });
    } catch (error) {
      logger.error('Error creating room', { error, userId: socket.userId });
      socket.emit('room:error', { error: 'Failed to create room' });
    }
  }

  // Typing Indicators
  handleTypingStart(socket, data) {
    const { roomId } = data;

    if (!this.typingUsers.has(roomId)) {
      this.typingUsers.set(roomId, new Map());
    }

    this.typingUsers.get(roomId).set(socket.userId, {
      userId: socket.userId,
      startedAt: new Date()
    });

    socket.to(roomId).emit('typing:start', {
      userId: socket.userId,
      roomId,
      timestamp: new Date()
    });

    // Auto-stop typing after 3 seconds
    setTimeout(() => {
      this.handleTypingStop(socket, roomId);
    }, 3000);
  }

  handleTypingStop(socket, roomId) {
    const roomTyping = this.typingUsers.get(roomId || socket.currentRoom);
    if (roomTyping) {
      roomTyping.delete(socket.userId);

      this.io.to(roomId || socket.currentRoom).emit('typing:stop', {
        userId: socket.userId,
        roomId: roomId || socket.currentRoom,
        timestamp: new Date()
      });
    }
  }

  // User Status Management
  updateUserStatus(userId, status, additionalInfo = {}) {
    this.onlineStatus.set(userId, {
      status,
      lastSeen: new Date(),
      ...additionalInfo
    });

    // Broadcast status update
    this.broadcastPresenceUpdate(userId, status);
  }

  broadcastPresenceUpdate(userId, status) {
    this.io.emit('presence:update', {
      userId,
      status,
      timestamp: new Date(),
      onlineCount: this.getOnlineUserCount()
    });
  }

  // Utility Methods
  trackUserConnection(userId, socketId, connectionInfo) {
    this.connectedUsers.set(userId, socketId);
    logger.debug('User connection tracked', { userId, socketId });
  }

  handleUserDisconnection(userId, socketId, reason) {
    // Update user status
    this.updateUserStatus(userId, 'offline', { disconnectedAt: new Date(), reason });

    // Queue messages for offline user
    this.queueMessagesForUser(userId);

    // Clean up user data
    this.connectedUsers.delete(userId);
    this.userRooms.delete(userId);

    // Clean up empty rooms
    this.cleanupEmptyRooms();

    logger.debug('User disconnection handled', { userId, socketId, reason });
  }

  isUserInRoom(userId, roomId) {
    return this.userRooms.get(userId)?.has(roomId) || false;
  }

  getOnlineUserCount() {
    return this.onlineStatus.size;
  }

  getRoomUserCount(roomId) {
    return this.roomUsers.get(roomId)?.size || 0;
  }

  // Message Processing
  processMessageMentions(message) {
    // Extract mentions from message content (@username)
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;

    while ((match = mentionRegex.exec(message.content)) !== null) {
      mentions.push(match[1]);
    }

    if (mentions.length > 0) {
      // Process mentions and send notifications
      mentions.forEach(username => {
        this.sendMentionNotification(message, username);
      });
    }
  }

  sendMentionNotification(message, username) {
    // Mock notification sending
    logger.debug('Mention notification sent', { messageId: message.id, username });
  }

  // Validation Methods
  validateMessage(content, messageType) {
    if (messageType === 'text') {
      return content && content.trim().length > 0 && content.length <= 10000;
    }
    return true; // Add validation for other message types
  }

  validateFile(file) {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];

    return file.size <= maxSize && allowedTypes.includes(file.type);
  }

  isValidReaction(reaction) {
    const validReactions = ['👍', '❤️', '😂', '😮', '😢', '😡', '🔥', '🎉'];
    return validReactions.includes(reaction);
  }

  sanitizeMessage(content) {
    // Basic sanitization - in production, use a proper sanitization library
    return content.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }

  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Database Operations (Mock implementations)
  async saveMessageToDatabase(message) {
    // Mock database save
    logger.debug('Message saved to database', { messageId: message.id });
    return message;
  }

  async getMessageById(messageId) {
    // Mock message retrieval
    return { id: messageId, userId: 'mock', roomId: 'mock' };
  }

  async updateMessage(messageId, updates) {
    // Mock message update
    return { ...updates, id: messageId };
  }

  async updateMessageReaction(messageId, userId, reaction) {
    // Mock reaction update
    return { id: messageId, reactions: { [reaction]: 1 } };
  }

  async deleteMessage(messageId) {
    // Mock message deletion
    logger.debug('Message deleted from database', { messageId });
  }

  async processFileUpload(file, userId) {
    // Mock file processing
    return {
      id: `file_${Date.now()}`,
      name: file.name,
      size: file.size,
      type: file.type,
      url: `/uploads/${file.name}`,
      uploadedBy: userId
    };
  }

  async createRoomInDatabase(roomData) {
    // Mock room creation
    logger.debug('Room created in database', { roomId: roomData.id });
    return roomData;
  }

  async sendRoomHistory(socket, roomId) {
    // Mock room history
    socket.emit('room:history', {
      roomId,
      messages: [],
      hasMore: false
    });
  }

  async updateRoomActivity(roomId) {
    // Mock room activity update
    logger.debug('Room activity updated', { roomId });
  }

  deliverQueuedMessages(userId, socket) {
    const queuedMessages = this.messageQueues.get(userId) || [];

    if (queuedMessages.length > 0) {
      socket.emit('messages:queued', queuedMessages);
      this.messageQueues.delete(userId);
      logger.debug('Queued messages delivered', { userId, count: queuedMessages.length });
    }
  }

  queueMessagesForUser(userId) {
    // Mock message queuing for offline users
    logger.debug('Messages queued for offline user', { userId });
  }

  cleanupEmptyRooms() {
    for (const [roomId, users] of this.roomUsers.entries()) {
      if (users.size === 0) {
        this.roomUsers.delete(roomId);
        logger.debug('Empty room cleaned up', { roomId });
      }
    }
  }

  // Advanced Features
  getUserStatus(userId) {
    return this.onlineStatus.get(userId) || { status: 'offline' };
  }

  getRoomInfo(roomId) {
    return {
      roomId,
      userCount: this.getRoomUserCount(roomId),
      users: Array.from(this.roomUsers.get(roomId) || [])
    };
  }

  getOnlineUsers() {
    return Array.from(this.onlineStatus.entries()).map(([userId, status]) => ({
      userId,
      ...status
    }));
  }

  // Performance Monitoring
  getSystemStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      activeRooms: this.roomUsers.size,
      onlineUsers: this.onlineStatus.size,
      messagesInQueue: Array.from(this.messageQueues.values()).reduce((sum, queue) => sum + queue.length, 0),
      typingUsers: Array.from(this.typingUsers.values()).reduce((sum, room) => sum + room.size, 0),
      timestamp: new Date()
    };
  }

  initializeEventHandlers() {
    // Set up periodic cleanup
    setInterval(() => {
      this.performMaintenance();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  performMaintenance() {
    // Clean up expired tokens
    // Clean up inactive users
    // Optimize memory usage
    // Update statistics

    logger.debug('Maintenance cycle completed');
  }

  // Public API
  getIO() {
    return this.io;
  }

  getConnectedUsers() {
    return Array.from(this.connectedUsers.entries());
  }

  getRoomUsers() {
    return Array.from(this.roomUsers.entries()).map(([roomId, users]) => ({
      roomId,
      userCount: users.size,
      users: Array.from(users)
    }));
  }

  broadcastToRoom(roomId, event, data) {
    if (this.io) {
      this.io.to(roomId).emit(event, data);
    }
  }

  broadcastToUser(userId, event, data) {
    if (this.io) {
      this.io.to(`user_${userId}`).emit(event, data);
    }
  }
}

const realtimeManager = new RealtimeManager();

module.exports = {
  RealtimeManager,
  realtimeManager
};
