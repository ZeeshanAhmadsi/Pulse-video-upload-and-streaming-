const User = require('../models/User');
const Organization = require('../models/Organization');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRE } = require('../config/env');
const { asyncHandler, ValidationError, ConflictError, UnauthorizedError, NotFoundError } = require('../middlewares/errorHandler.middleware');

// Generate JWT Token
const generateToken = (userId, role, tenantId) => {
  return jwt.sign(
    { userId, role, tenantId },
    JWT_SECRET,
    { 
      expiresIn: JWT_EXPIRE,
      issuer: 'pulse-video-api',
      audience: 'pulse-video-client'
    }
  );
};

// Generate Refresh Token (optional, for future use)
const generateRefreshToken = (userId, role, tenantId) => {
  const { JWT_REFRESH_EXPIRE } = require('../config/env');
  return jwt.sign(
    { userId, role, tenantId, type: 'refresh' },
    JWT_SECRET,
    { 
      expiresIn: JWT_REFRESH_EXPIRE,
      issuer: 'pulse-video-api',
      audience: 'pulse-video-client'
    }
  );
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = asyncHandler(async (req, res) => {
  const { email, password, role = 'viewer', tenantId, organizationName } = req.body;

  // Validate input
  if (!email || !password || !tenantId) {
    throw new ValidationError('Please provide email, password, and tenantId', {
      email: !email ? 'Email is required' : undefined,
      password: !password ? 'Password is required' : undefined,
      tenantId: !tenantId ? 'Tenant ID is required' : undefined
    });
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ConflictError('User already exists with this email');
  }

  // Check if organization exists, if not create it
  let organization = await Organization.findOne({ tenantId });
  if (!organization) {
    if (!organizationName) {
      throw new ValidationError('Organization not found. Please provide organizationName to create it');
    }
    organization = await Organization.create({
      name: organizationName,
      tenantId
    });
  }

  // Create user
  const user = await User.create({
    email,
    password,
    role,
    tenantId,
    organization: organization._id
  });

  // Generate token
  const token = generateToken(user._id.toString(), user.role, user.tenantId);

  res.status(201).json({
    success: true,
    message: 'User registered successfully',
    data: {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId
      },
      token
    }
  });
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    throw new ValidationError('Please provide email and password', {
      email: !email ? 'Email is required' : undefined,
      password: !password ? 'Password is required' : undefined
    });
  }

  // Find user and include password for comparison
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Generate token
  const token = generateToken(user._id.toString(), user.role, user.tenantId);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId
      },
      token
    }
  });
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId).populate('organization');
  
  if (!user) {
    throw new NotFoundError('User');
  }

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        organization: user.organization
      }
    }
  });
});

module.exports = {
  register,
  login,
  getMe
};
