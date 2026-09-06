import express from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/auth.controller.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Register new user (email optional)
router.post(
  '/register',
  [
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('username').isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/),
    body('email').optional({ checkFalsy: true }).isEmail().normalizeEmail()
  ],
  authController.register
);

// Login (accepts username OR email)
router.post(
  '/login',
  [
    body('identifier').notEmpty().withMessage('Username or email required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  authController.login
);

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-fallback', { ignoreExpiration: true });

    // Generate new token
    const newToken = jwt.sign(
      { userId: decoded.userId, email: decoded.email },
      process.env.JWT_SECRET || 'secret-fallback',
      { expiresIn: '7d' }
    );

    res.json({ token: newToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
