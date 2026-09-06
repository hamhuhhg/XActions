/**
 * Webhook Receiver Routes
 */

import express from 'express';
import * as webhooksController from '../controllers/webhooks.controller.js';

const router = express.Router();

// POST /webhooks/payments - Receive x402 payment notifications
router.post('/payments', express.json(), webhooksController.handlePaymentWebhook);

// GET /webhooks/health - Health check for webhook endpoint
router.get('/health', webhooksController.getWebhookHealth);

export default router;
