import express from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthService } from '../services/AuthService.js';
import { createUserSchema, loginSchema } from '../types/user.types.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { asyncHandler, ValidationError } from '../middleware/error.middleware.js';
import { validate, validationChains } from '../middleware/validation.middleware.js';
import { rateLimits } from '../middleware/security.middleware.js';
import { logger } from '../utils/logger.js';

const router = express.Router();
const prisma = new PrismaClient();
const authService = new AuthService(prisma);

// Apply specific rate limiting to registration endpoint
router.use('/register', rateLimits.registration);

// Register endpoint
router.post('/register', validate(validationChains.registerUser), asyncHandler(async (req, res) => {
  const userData = req.body;
  const ipAddress = req.ip;
  const userAgent = req.get('User-Agent');

  // Register user
  const user = await authService.register(userData, ipAddress, userAgent);

  res.status(201).json({
    success: true,
    data: {
      user,
      message: 'User registered successfully',
    },
  });
}));

// Login endpoint
router.post('/login', validate(validationChains.loginUser), asyncHandler(async (req, res) => {
  const loginData = req.body;
  const ipAddress = req.ip;
  const userAgent = req.get('User-Agent');

  // Login user
  const result = await authService.login(loginData, ipAddress, userAgent);

  // Set refresh token as httpOnly cookie
  res.cookie('refreshToken', result.tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.status(200).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.tokens.accessToken,
      message: 'Login successful',
    },
  });
}));

// Logout endpoint
router.post('/logout', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user!.userId;
  const refreshToken = req.cookies.refreshToken;
  const ipAddress = req.ip;
  const userAgent = req.get('User-Agent');

  if (refreshToken) {
    await authService.logout(userId, refreshToken, ipAddress, userAgent);
  }

  // Clear refresh token cookie
  res.clearCookie('refreshToken');

  res.status(200).json({
    success: true,
    data: {
      message: 'Logout successful',
    },
  });
}));

// Refresh token endpoint
router.post('/refresh', asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    throw new ValidationError('Refresh token not provided');
  }

  // Refresh tokens
  const tokens = await authService.refreshTokens(refreshToken);

  // Set new refresh token as httpOnly cookie
  res.cookie('refreshToken', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.status(200).json({
    success: true,
    data: {
      accessToken: tokens.accessToken,
      message: 'Tokens refreshed successfully',
    },
  });
}));

// Get user profile endpoint
router.get('/profile', authenticateToken, asyncHandler(async (req, res) => {
  const userId = req.user!.userId;

  // Get user profile
  const user = await authService.getProfile(userId);

  res.status(200).json({
    success: true,
    data: {
      user,
    },
  });
}));

export default router;