const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/auth.controller');
const authenticate = require('../middlewares/auth.middleware');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/me', authenticate, getMe);

module.exports = router;
