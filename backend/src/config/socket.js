import jwt from 'jsonwebtoken';

/**
 * Setup Socket.IO connection handlers
 */
export const setupSocketIO = (io) => {
  // Middleware for authentication
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.userId} (${socket.userRole})`);

    // Join user-specific room
    socket.join(`user:${socket.userId}`);
    
    // Join role-specific room
    socket.join(`role:${socket.userRole}`);

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.userId}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.userId}:`, error);
    });

    // Custom events can be added here
    socket.on('join_course', (courseId) => {
      socket.join(`course:${courseId}`);
      console.log(`User ${socket.userId} joined course ${courseId}`);
    });

    socket.on('leave_course', (courseId) => {
      socket.leave(`course:${courseId}`);
      console.log(`User ${socket.userId} left course ${courseId}`);
    });
  });

  console.log('🔌 Socket.IO setup complete');
};
