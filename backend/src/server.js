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

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://pulsevideouploadandstreaming.vercel.app',
      'http://localhost:3000',
      'http://localhost:5173'
    ];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = `CORS policy does not allow ${origin}`;
      console.error(msg);
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Allow-Origin',
    'Access-Control-Allow-Credentials'
  ],
  exposedHeaders: [
    'Content-Range',
    'X-Content-Range',
    'Access-Control-Allow-Credentials',
    'Access-Control-Allow-Origin'
  ],
  optionsSuccessStatus: 200,
  preflightContinue: false
};

// Handle preflight for all routes
app.options('*', cors(corsOptions));

// Middleware
app.use(cors(corsOptions)); // Enable preflight for all routes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Add CORS headers to all responses
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://pulsevideouploadandstreaming.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ];
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-auth-token');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

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
