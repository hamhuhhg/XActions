/**
 * License validation API routes
 */

import { Router } from 'express';
import * as licenseController from '../controllers/license.controller.js';

const router = Router();

// GET /api/license - Get current license status
router.get('/', licenseController.getStatus);

// POST /api/license/validate - Validate a license key
router.post('/validate', licenseController.validate);

// GET /api/license/tiers - List available license tiers and features
router.get('/tiers', licenseController.getTiers);

export default router;
