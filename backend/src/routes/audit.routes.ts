import { Router, Response } from 'express';
import { getAuditService } from '../middleware/audit.middleware.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { validate, validationChains } from '../middleware/validation.middleware.js';
import { AuthenticatedRequest } from '../types/common.types.js';
import { query } from 'express-validator';

const router = Router();

// Apply authentication middleware to all audit routes
router.use(authMiddleware);

// Only allow admin users to access audit logs
const requireAdmin = (req: AuthenticatedRequest, res: Response, next: Function) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Admin access required',
        timestamp: new Date().toISOString(),
      },
    });
  }
  next();
};

router.use(requireAdmin);

// Validation for audit log queries
const auditLogValidation = [
  query('userId').optional().isUUID().withMessage('userId must be a valid UUID'),
  query('action').optional().isString().withMessage('action must be a string'),
  query('resourceType').optional().isString().withMessage('resourceType must be a string'),
  query('resourceId').optional().isUUID().withMessage('resourceId must be a valid UUID'),
  query('success').optional().isBoolean().withMessage('success must be a boolean'),
  query('startDate').optional().isISO8601().withMessage('startDate must be a valid date'),
  query('endDate').optional().isISO8601().withMessage('endDate must be a valid date'),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
];

// GET /api/audit/logs - Get audit logs with filtering
router.get('/logs', validate(auditLogValidation), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const auditService = getAuditService();
  
  const filter = {
    userId: req.query.userId as string,
    action: req.query.action as string,
    resourceType: req.query.resourceType as string,
    resourceId: req.query.resourceId as string,
    success: req.query.success ? req.query.success === 'true' : undefined,
    startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
    endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
    page: req.query.page ? parseInt(req.query.page as string) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
  };

  const result = await auditService.getAuditLogs(filter);

  res.json({
    success: true,
    data: result,
    message: 'Audit logs retrieved successfully',
  });
}));

// GET /api/audit/stats - Get audit statistics
router.get('/stats', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const auditService = getAuditService();
  
  const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
  const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

  const stats = await auditService.getAuditStats(startDate, endDate);

  res.json({
    success: true,
    data: stats,
    message: 'Audit statistics retrieved successfully',
  });
}));

// GET /api/audit/security-events - Get recent security events
router.get('/security-events', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const auditService = getAuditService();
  
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
  
  const events = await auditService.getRecentSecurityEvents(limit);

  res.json({
    success: true,
    data: events,
    message: 'Security events retrieved successfully',
  });
}));

// GET /api/audit/suspicious-activity - Detect suspicious activity
router.get('/suspicious-activity', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const auditService = getAuditService();
  
  const timeWindowMinutes = req.query.timeWindow ? parseInt(req.query.timeWindow as string) : 15;
  
  const suspiciousActivity = await auditService.detectSuspiciousActivity(timeWindowMinutes);

  res.json({
    success: true,
    data: suspiciousActivity,
    message: 'Suspicious activity analysis completed',
  });
}));

// POST /api/audit/cleanup - Clean up old audit logs
router.post('/cleanup', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const auditService = getAuditService();
  
  const olderThanDays = req.body.olderThanDays || 90;
  
  const deletedCount = await auditService.cleanupOldLogs(olderThanDays);

  // Log the cleanup operation
  await auditService.logSystemEvent('MAINTENANCE', true, undefined, {
    operation: 'audit_log_cleanup',
    deletedCount,
    olderThanDays,
    performedBy: req.user!.id,
  });

  res.json({
    success: true,
    data: {
      deletedCount,
      olderThanDays,
    },
    message: 'Audit log cleanup completed successfully',
  });
}));

export default router;