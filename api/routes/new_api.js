/**
 * Unified API Router for Dashboard (Scrapers + Automation + Campaigns)
 * Clean routing delegating directly to dedicated controllers
 */

import { Router } from 'express';
import * as scraperController from '../controllers/scraper.controller.js';
import * as automationController from '../controllers/automation.controller.js';

const router = Router();

// ============================================================================
// DATA SCRAPER ENDPOINTS
// ============================================================================
router.get('/profile', scraperController.getProfile);
router.get('/followers', scraperController.getFollowers);
router.get('/following', scraperController.getFollowing);
router.get('/tweets', scraperController.getTweets);
router.get('/search', scraperController.searchTweets);
router.get('/hashtag', scraperController.getHashtag);
router.get('/thread', scraperController.getThread);
router.get('/media', scraperController.getMedia);

// ============================================================================
// AUTOMATION & LOGIN ACTION ENDPOINTS
// ============================================================================
router.post('/run', automationController.runScript);
router.get('/login', automationController.interactiveLogin);
router.post('/check_suspension', automationController.checkSuspension);
router.post('/safe_browser', automationController.launchSafeBrowser);
router.post('/facebook/run', automationController.runFacebookAction);

// ============================================================================
// CAMPAIGNS & ACCOUNTS MANAGEMENT
// ============================================================================
router.get('/campaigns', automationController.getCampaigns);
router.post('/campaigns', automationController.saveCampaign);
router.delete('/campaigns/:id', automationController.deleteCampaign);
router.post('/campaigns/:id/execute', automationController.executeCampaign);

router.get('/accounts', automationController.getAccounts);
router.post('/accounts/sync', automationController.syncAccounts);
router.delete('/accounts/:id', automationController.deleteAccount);

router.post('/upload_media', automationController.uploadMedia);

export default router;
