import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as userController from '../controllers/user.controller.js';

const router = express.Router();

// All user routes require authentication
router.use(authMiddleware);

// Get user profile
router.get('/profile', userController.getProfile);

// Update user profile
router.patch('/profile', userController.updateProfile);

// Get user statistics
router.get('/stats', userController.getStats);

export default router;
