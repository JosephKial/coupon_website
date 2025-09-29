import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth.routes.js';
import couponRoutes from './routes/coupon.routes.js';
import auditRoutes from './routes/audit.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { 
  securityHeaders, 
  httpsEnforcement, 
  rateLimits, 
  securityLogger, 
  ipFilter,
  generateCsrfToken 
} from './middleware/security.middleware.js';
import { initializeAuditService, auditLogger } from './middleware/audit.middleware.js';
import { logger } from './utils/logger.js';
import { redisClient } from './utils/redis.js';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Initialize Prisma client
export const prisma = new PrismaClient();

// Initialize audit service
const auditService = initializeAuditService(prisma);

// Security middleware (order matters!)
app.use(httpsEnforcement);
app.use(securityHeaders);
app.use(ipFilter);
app.use(securityLogger);

// Audit logging middleware
app.use(auditLogger);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
}));

// General rate limiting
app.use(rateLimits.general);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// CSRF token endpoint
app.get('/api/csrf-token', generateCsrfToken);

// API routes with specific rate limiting
app.use('/api/auth', rateLimits.auth, authRoutes);
app.use('/api/coupons', rateLimits.crud, couponRoutes);
app.use('/api/audit', rateLimits.general, auditRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
      timestamp: new Date().toISOString(),
    },
  });
});

// Initialize Redis connection
redisClient.connect().catch((error) => {
  logger.error('Failed to connect to Redis:', error);
});

// Log system startup
auditService.logSystemEvent('STARTUP', true, undefined, {
  port,
  nodeEnv: process.env.NODE_ENV,
  timestamp: new Date(),
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully`);
  
  // Log system shutdown
  await auditService.logSystemEvent('SHUTDOWN', true, undefined, {
    signal,
    timestamp: new Date(),
  });
  
  await Promise.all([
    prisma.$disconnect(),
    redisClient.disconnect()
  ]);
  
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  logger.error('Uncaught exception:', error);
  
  await auditService.logSystemEvent('ERROR', false, error.message, {
    stack: error.stack,
    timestamp: new Date(),
  });
  
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', async (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  
  await auditService.logSystemEvent('ERROR', false, 'Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    timestamp: new Date(),
  });
  
  process.exit(1);
});

// Start server
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});

export default app;