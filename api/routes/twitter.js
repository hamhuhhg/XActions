import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import * as twitterController from '../controllers/twitter.controller.js';

const router = express.Router();

// Initiate Twitter OAuth
router.get('/connect', authMiddleware, twitterController.connect);

// OAuth callback
router.get('/callback', twitterController.callback);

// Disconnect Twitter
router.post('/disconnect', authMiddleware, twitterController.disconnect);

export default router;
export const getTwitterClient = twitterController.getTwitterClient;
export const refreshTwitterToken = twitterController.refreshTwitterToken;
