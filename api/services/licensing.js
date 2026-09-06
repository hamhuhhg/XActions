/**
 * XActions Licensing, Key Management & Telemetry Service
 * 
 * Unified licensing service:
 * - Anonymous usage ping (opt-out with XACTIONS_NO_TELEMETRY=1)
 * - License key generation, signature verification & activation
 * - Database persistence via Prisma
 * - "Powered by XActions" branding control and middleware
 */

import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// License key format: XACT-TIER-XXXX-XXXX-SIGN
const LICENSE_PREFIX = 'XACT';

// Tier codes for key generation
const TIER_CODES = {
  starter: 'STRT',
  business: 'BUSI',
  enterprise: 'ENTR',
};

// Features unlocked by license tiers
const LICENSE_TIERS = {
  free: {
    showBranding: true,
    maxUsers: 100,
    maxInstances: 1,
    customDomain: false,
    whiteLabel: false,
    apiAccess: false,
    price: 0,
  },
  starter: {
    showBranding: true,
    maxUsers: 500,
    maxInstances: 1,
    customDomain: true,
    whiteLabel: false,
    apiAccess: false,
    price: 49,
  },
  business: {
    showBranding: false,
    maxUsers: 5000,
    maxInstances: 3,
    customDomain: true,
    whiteLabel: true,
    apiAccess: true,
    price: 199,
  },
  enterprise: {
    showBranding: false,
    maxUsers: -1, // unlimited
    maxInstances: -1,
    customDomain: true,
    whiteLabel: true,
    apiAccess: true,
    price: 'custom',
  },
};

// Alias for backward compatibility
const TIER_FEATURES = LICENSE_TIERS;

// In-memory cache
let cachedLicense = null;
let instanceId = null;

/**
 * Generate a unique instance ID (persisted in env or generated once)
 */
function getInstanceId() {
  if (instanceId) return instanceId;
  
  if (process.env.XACTIONS_INSTANCE_ID) {
    instanceId = process.env.XACTIONS_INSTANCE_ID;
  } else {
    const hostname = process.env.HOSTNAME || process.env.RAILWAY_SERVICE_NAME || 'unknown';
    instanceId = crypto.createHash('sha256')
      .update(`${hostname}-${Date.now()}-${Math.random()}`)
      .digest('hex')
      .substring(0, 16);
  }
  
  return instanceId;
}

/**
 * Send anonymous usage ping (opt-out with XACTIONS_NO_TELEMETRY=1)
 */
async function sendTelemetryPing() {
  if (process.env.XACTIONS_NO_TELEMETRY === '1') {
    console.log('📊 Telemetry disabled (XACTIONS_NO_TELEMETRY=1)');
    return;
  }
  
  try {
    const payload = {
      instanceId: getInstanceId(),
      version: process.env.npm_package_version || '1.0.0',
      nodeVersion: process.version,
      platform: process.platform,
      hasLicense: !!process.env.XACTIONS_LICENSE_KEY,
      timestamp: new Date().toISOString(),
    };
    
    fetch('https://telemetry.xactions.app/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    }).catch(() => {
      // Silently fail - telemetry should never break the app
    });
    
    console.log('📊 Anonymous telemetry ping sent (opt-out: XACTIONS_NO_TELEMETRY=1)');
  } catch (e) {
    // Silently fail
  }
}

/**
 * Generate a random segment for license key
 */
function generateSegment(length = 4) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1 to avoid confusion
  let segment = '';
  for (let i = 0; i < length; i++) {
    segment += chars.charAt(crypto.randomInt(chars.length));
  }
  return segment;
}

/**
 * Generate a new license key
 * Format: XACT-TIER-XXXX-XXXX-SIGN
 */
function generateLicenseKey(tier) {
  const tierCode = TIER_CODES[tier] || 'STRT';
  const segment1 = generateSegment(4);
  const segment2 = generateSegment(4);
  
  const signature = crypto.createHash('sha256')
    .update(`${tierCode}${segment1}${segment2}${process.env.JWT_SECRET || 'xactions'}`)
    .digest('hex')
    .substring(0, 4)
    .toUpperCase();
  
  return `XACT-${tierCode}-${segment1}-${segment2}-${signature}`;
}

/**
 * Verify license key signature
 */
function verifyKeySignature(key) {
  if (!key || typeof key !== 'string') return false;
  const parts = key.split('-');
  if (parts.length !== 5 || parts[0] !== LICENSE_PREFIX) return false;
  
  const [, tierCode, segment1, segment2, signature] = parts;
  
  const expectedSignature = crypto.createHash('sha256')
    .update(`${tierCode}${segment1}${segment2}${process.env.JWT_SECRET || 'xactions'}`)
    .digest('hex')
    .substring(0, 4)
    .toUpperCase();
  
  return signature === expectedSignature;
}

/**
 * Validate a license key format
 */
function isValidKeyFormat(key) {
  return verifyKeySignature(key);
}

/**
 * Create a new license in the database
 */
async function createLicense(options) {
  const {
    tier = 'starter',
    customerName,
    customerEmail,
    companyName,
    expiresAt,
    maxInstances,
    notes,
    paymentId,
    amountPaid,
  } = options;

  const features = LICENSE_TIERS[tier] || LICENSE_TIERS.starter;
  const key = generateLicenseKey(tier);

  const license = await prisma.license.create({
    data: {
      key,
      tier,
      customerName,
      customerEmail,
      companyName,
      maxUsers: features.maxUsers,
      maxInstances: maxInstances || features.maxInstances,
      whiteLabel: features.whiteLabel,
      customDomain: features.customDomain,
      apiAccess: features.apiAccess,
      expiresAt: expiresAt || null,
      paymentId,
      amountPaid,
      notes,
    },
  });

  return license;
}

/**
 * Validate a license key against the database
 */
async function validateLicenseKey(key) {
  if (!key || !verifyKeySignature(key)) {
    return { valid: false, error: 'Invalid license key format' };
  }

  const license = await prisma.license.findUnique({
    where: { key },
  });

  if (!license) {
    return { valid: false, error: 'License key not found' };
  }

  if (license.status === 'revoked') {
    return { valid: false, error: 'License has been revoked' };
  }

  if (license.status === 'suspended') {
    return { valid: false, error: 'License is suspended' };
  }

  if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
    return { valid: false, error: 'License has expired' };
  }

  return {
    valid: true,
    tier: license.tier,
    features: {
      maxUsers: license.maxUsers,
      maxInstances: license.maxInstances,
      whiteLabel: license.whiteLabel,
      customDomain: license.customDomain,
      apiAccess: license.apiAccess,
      showBranding: !license.whiteLabel,
    },
    expiresAt: license.expiresAt,
    customer: {
      name: license.customerName,
      email: license.customerEmail,
      company: license.companyName,
    },
  };
}

/**
 * Activate a license on an instance
 */
async function activateLicense(key, instId) {
  const license = await prisma.license.findUnique({
    where: { key },
  });

  if (!license) {
    return { success: false, error: 'License not found' };
  }

  let instanceIds = [];
  try {
    instanceIds = JSON.parse(license.instanceIds || '[]');
  } catch (e) {
    instanceIds = [];
  }

  if (instanceIds.includes(instId)) {
    return { success: true, message: 'Already activated on this instance' };
  }

  if (license.maxInstances !== -1 && instanceIds.length >= license.maxInstances) {
    return { success: false, error: `Maximum instances (${license.maxInstances}) reached` };
  }

  instanceIds.push(instId);

  await prisma.license.update({
    where: { key },
    data: {
      instanceIds: JSON.stringify(instanceIds),
      activations: license.activations + 1,
      lastActivatedAt: new Date(),
    },
  });

  return { success: true, message: 'License activated successfully' };
}

/**
 * Revoke a license
 */
async function revokeLicense(key, reason) {
  const license = await prisma.license.update({
    where: { key },
    data: {
      status: 'revoked',
      notes: reason ? `Revoked: ${reason}` : 'Revoked by admin',
    },
  });

  return license;
}

/**
 * List all licenses
 */
async function listLicenses(options = {}) {
  const { status, tier, limit = 100, offset = 0 } = options;

  const where = {};
  if (status) where.status = status;
  if (tier) where.tier = tier;

  const licenses = await prisma.license.findMany({
    where,
    take: limit,
    skip: offset,
    orderBy: { createdAt: 'desc' },
  });

  const total = await prisma.license.count({ where });

  return { licenses, total };
}

/**
 * Get license by key
 */
async function getLicense(key) {
  return prisma.license.findUnique({
    where: { key },
  });
}

/**
 * Validate license key and activate on this instance
 */
async function validateLicense(licenseKey) {
  if (!licenseKey || !isValidKeyFormat(licenseKey)) {
    return { valid: false, tier: 'free', error: 'Invalid license key format' };
  }
  
  try {
    const result = await validateLicenseKey(licenseKey);
    
    if (!result.valid) {
      return { valid: false, tier: 'free', error: result.error };
    }
    
    const currentInstanceId = getInstanceId();
    await activateLicense(licenseKey, currentInstanceId);
    
    return {
      valid: true,
      tier: result.tier,
      features: result.features,
      expiresAt: result.expiresAt,
      customer: result.customer,
    };
  } catch (e) {
    console.error('License validation error:', e);
    return { valid: false, tier: 'free', error: 'License validation failed' };
  }
}

/**
 * Get current active license status
 */
async function getLicenseStatus() {
  if (cachedLicense) return cachedLicense;
  
  const licenseKey = process.env.XACTIONS_LICENSE_KEY;
  
  if (!licenseKey) {
    cachedLicense = {
      valid: false,
      tier: 'free',
      features: LICENSE_TIERS.free,
    };
    return cachedLicense;
  }
  
  cachedLicense = await validateLicense(licenseKey);
  return cachedLicense;
}

/**
 * Check if branding should be shown
 */
async function shouldShowBranding() {
  const license = await getLicenseStatus();
  return license.features?.showBranding !== false;
}

/**
 * Check if a feature is enabled
 */
async function isFeatureEnabled(feature) {
  const license = await getLicenseStatus();
  return license.features?.[feature] === true;
}

/**
 * Get branding HTML (for footer injection)
 */
async function getBrandingHtml() {
  if (!(await shouldShowBranding())) {
    return '';
  }
  
  return `
    <div id="xactions-branding" style="
      position: fixed;
      bottom: 12px;
      right: 12px;
      background: rgba(0,0,0,0.8);
      color: #71767b;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 11px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      z-index: 9999;
      pointer-events: auto;
    ">
      <a href="https://xactions.app" target="_blank" rel="noopener" style="
        color: #1d9bf0;
        text-decoration: none;
      ">⚡ Powered by XActions</a>
    </div>
  `;
}

/**
 * Initialize licensing on server start
 */
async function initializeLicensing() {
  console.log('🔐 Initializing licensing...');
  
  const license = await getLicenseStatus();
  console.log(`📜 License tier: ${license.tier}`);
  
  if (license.tier === 'free') {
    console.log('💡 Running in free mode - "Powered by XActions" branding will be shown');
    console.log('💡 Get a license at https://xactions.app/enterprise');
  }
  
  await sendTelemetryPing();
  
  return license;
}

/**
 * Express middleware to inject branding
 */
function brandingMiddleware() {
  return async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = async function(body) {
      if (typeof body === 'string' && 
          body.includes('</body>') && 
          await shouldShowBranding()) {
        const branding = await getBrandingHtml();
        body = body.replace('</body>', `${branding}</body>`);
      }
      return originalSend.call(this, body);
    };
    
    next();
  };
}

export {
  initializeLicensing,
  validateLicense,
  validateLicenseKey,
  createLicense,
  activateLicense,
  revokeLicense,
  listLicenses,
  getLicense,
  getLicenseStatus,
  shouldShowBranding,
  isFeatureEnabled,
  getBrandingHtml,
  brandingMiddleware,
  sendTelemetryPing,
  getInstanceId,
  generateLicenseKey,
  verifyKeySignature,
  isValidKeyFormat,
  LICENSE_TIERS,
  TIER_FEATURES,
  TIER_CODES,
};
