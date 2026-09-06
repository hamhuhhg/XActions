import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as operationsController from '../controllers/operations.controller.js';

const router = express.Router();

// All operation routes require authentication
router.use(authMiddleware);

// Unfollow non-followers
router.post('/unfollow-non-followers', operationsController.unfollowNonFollowers);

// Unfollow everyone
router.post('/unfollow-everyone', operationsController.unfollowEveryone);

// Detect unfollowers
router.post('/detect-unfollowers', operationsController.detectUnfollowers);

// Get operation status
router.get('/status/:operationId', operationsController.getOperationStatus);

// Cancel operation
router.post('/cancel/:operationId', operationsController.cancelOperation);

// List all operations
router.get('/', operationsController.listOperations);

export default router;
