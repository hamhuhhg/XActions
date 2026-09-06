import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import * as sessionAuthController from '../controllers/session-auth.controller.js';
import { encrypt, decrypt } from '../utils/security.js';

const router = express.Router();

// Save session cookie for browser automation
router.post(
  '/save-session',
  authenticate,
  [
    body('sessionCookie').notEmpty().withMessage('Session cookie is required'),
    body('username').optional().isString()
  ],
  sessionAuthController.saveSession
);

// Remove session cookie (switch back to OAuth)
router.delete('/remove-session', authenticate, sessionAuthController.removeSession);

// Get current auth method
router.get('/auth-method', authenticate, sessionAuthController.getAuthMethod);

export default router;
export { encrypt, decrypt };
export const getDecryptedSessionCookie = sessionAuthController.getDecryptedSessionCookie;
