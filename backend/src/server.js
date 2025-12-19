const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');
const { PORT, CORS_ORIGIN, CORS_CREDENTIALS, NODE_ENV } = require('./config/env');
const { initializeProgressSocket } = require('./sockets/progress.socket');

// Import routes
const authRoutes = require('./routes/auth.routes');
const videoRoutes = require('./routes/video.routes');
const userRoutes = require('./routes/user.routes');

// Initialize app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Configure CORS origins
const corsOrigins = CORS_ORIGIN === '*' 
  ? '*' 
  : CORS_ORIGIN.split(',').map(origin => origin.trim());

// Initialize Socket.io with CORS configuration
const io = new Server(server, {
  cors: {
    origin: corsOrigins,
    methods: ['GET', 'POST'],
    credentials: CORS_CREDENTIALS
  }
});

// Initialize Socket.io namespaces
initializeProgressSocket(io);

// Make io available to routes via app.locals
app.locals.io = io;

// Connect to database
connectDB();

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// CORS Configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = CORS_ORIGIN === '*' 
      ? ['*'] 
      : CORS_ORIGIN.split(',').map(o => o.trim());

    // 1. Allow if no origin (Like mobile apps, some browser requests, or Postman)
    if (!origin) {
      return callback(null, true);
    }

    // 2. Allow if origin is in the list or if list is '*'
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`CORS Blocked for origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Set this explicitly to true
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200 
};

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// Routes
app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/users', userRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running'
  });
});

// Import error handler
const { errorHandler, notFound } = require('./middlewares/errorHandler.middleware');

app.get("/", (req, res) => {
  res.json({ message: "Pulse backend is running 🚀" });
});


// 404 handler
app.use(notFound);

// Central error handling middleware (must be last)
app.use(errorHandler);

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`Socket.io server initialized`);
});

module.exports = { app, server, io };
