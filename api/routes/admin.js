/**
 * Admin routes for license management and payment monitoring
 */

import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import * as adminController from '../controllers/admin.controller.js';

const router = Router();

// License management (requires admin auth)
router.post('/licenses', authenticateToken, requireAdmin, adminController.createNewLicense);
router.get('/licenses', authenticateToken, requireAdmin, adminController.getLicenses);
router.get('/licenses/:key', authenticateToken, requireAdmin, adminController.getLicenseByKey);
router.post('/licenses/:key/revoke', authenticateToken, requireAdmin, adminController.revokeLicenseByKey);
router.get('/tiers', authenticateToken, requireAdmin, adminController.getLicenseTiers);
router.post('/licenses/:key/validate', authenticateToken, requireAdmin, adminController.validateLicense);

// x402 Payment Monitoring (protected by x-admin-key header)
router.get('/x402/stats', adminController.getX402Stats);
router.get('/x402/webhooks', adminController.getX402Webhooks);
router.post('/x402/webhooks/test', adminController.testX402Webhooks);

export default router;
