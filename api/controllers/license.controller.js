import { 
  validateLicense, 
  getLicenseStatus, 
  LICENSE_TIERS 
} from '../services/licensing.js';

/**
 * Get current license status (public info only)
 */
export async function getStatus(req, res) {
  try {
    const license = await getLicenseStatus();
    
    res.json({
      tier: license.tier,
      features: {
        showBranding: license.features?.showBranding,
        whiteLabel: license.features?.whiteLabel,
        customDomain: license.features?.customDomain,
      },
      valid: license.valid,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check license status' });
  }
}

/**
 * Validate a license key (for testing before purchase)
 */
export async function validate(req, res) {
  try {
    const { licenseKey } = req.body;
    
    if (!licenseKey) {
      return res.status(400).json({ error: 'License key required' });
    }
    
    const result = await validateLicense(licenseKey);
    
    res.json({
      valid: result.valid,
      tier: result.tier,
      features: result.valid ? result.features : null,
      error: result.error || null,
    });
  } catch (error) {
    res.status(500).json({ error: 'License validation failed' });
  }
}

/**
 * List available license tiers and features
 */
export function getTiers(req, res) {
  res.json({
    tiers: Object.entries(LICENSE_TIERS).map(([name, features]) => ({
      name,
      features,
    })),
    pricing: {
      free: { price: 0, period: 'forever' },
      starter: { price: 49, period: 'month' },
      business: { price: 199, period: 'month' },
      enterprise: { price: 'custom', period: 'year' },
    },
    contact: 'https://xactions.app/enterprise',
  });
}
