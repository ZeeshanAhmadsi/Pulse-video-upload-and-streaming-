const express = require('express');
const router = express.Router();
const cors = require('cors');
const { register, login, getMe } = require('../controllers/auth.controller');
const authenticate = require('../middlewares/auth.middleware');

// CORS configuration for auth routes
const corsOptions = {
  origin: [
    'https://pulsevideouploadandstreaming.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
  optionsSuccessStatus: 200
};

// Handle OPTIONS for all routes
router.options('*', cors(corsOptions));

// Public routes
router.post('/register', cors(corsOptions), register);
router.post('/login', cors(corsOptions), login);

// Protected routes
router.get('/me', cors(corsOptions), authenticate, getMe);

module.exports = router;
