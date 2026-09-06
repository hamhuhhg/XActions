/**
 * Universal Cookie Normalizer for XActions
 * Handles multiple formats:
 * 1. Firefox / Cookie Quick Manager: [{"Name raw": "...", "Content raw": "...", "Host raw": "..."}]
 * 2. Chrome / EditThisCookie / Cookie-Editor: [{"name": "...", "value": "...", "domain": "..."}]
 * 3. Key-Value JSON object: {"c_user": "...", "xs": "...", "sb": "...", "datr": "..."}
 * 4. Raw Cookie String: "c_user=...; xs=...; sb=...;"
 */

export function normalizeFacebookCookies(input, defaultDomain = '.facebook.com') {
  if (!input) return [];
  let parsed = input;

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || 
        (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      try {
        parsed = JSON.parse(trimmed);
      } catch (e) {
        parsed = null;
      }
    }
  }

  const result = [];

  const normalizeItem = (item) => {
    if (!item || typeof item !== 'object') return null;

    // Detect Name
    const name = item.name || item['Name raw'] || item.Name || item.key;

    // Detect Value
    const value = item.value !== undefined 
      ? item.value 
      : (item['Content raw'] !== undefined 
          ? item['Content raw'] 
          : (item.Content !== undefined ? item.Content : item.value_raw));

    if (!name || value === undefined || value === null) return null;

    // Detect Domain
    let domain = item.domain || item['Host raw'] || item.Host || item.host || defaultDomain;
    if (typeof domain === 'string') {
      domain = domain.replace(/^https?:\/\//i, '').replace(/\/+$/, '').trim();
      if (!domain.startsWith('.') && !domain.includes(':')) {
        domain = '.' + domain;
      }
    } else {
      domain = defaultDomain;
    }

    // Detect Path
    const path = item.path || item['Path raw'] || item.Path || '/';

    // Detect Secure
    let secure = true;
    if (item.secure !== undefined) {
      secure = Boolean(item.secure);
    } else if (item['Send for raw'] !== undefined) {
      secure = item['Send for raw'] === 'true' || item['Send for raw'] === true;
    }

    // Detect HttpOnly
    let httpOnly = false;
    if (item.httpOnly !== undefined) {
      httpOnly = Boolean(item.httpOnly);
    } else if (item['HTTP only raw'] !== undefined) {
      httpOnly = item['HTTP only raw'] === 'true' || item['HTTP only raw'] === true;
    } else {
      httpOnly = ['xs', 'fr', 'datr', 'sb'].includes(String(name));
    }

    // Detect Expires
    let expires = undefined;
    const expVal = item.expires || item.expirationDate || item['Expires raw'];
    if (expVal) {
      const exp = Number(expVal);
      if (!isNaN(exp) && exp > 0) {
        expires = exp;
      }
    }

    return {
      name: String(name).trim(),
      value: String(value).trim(),
      domain,
      path,
      secure,
      httpOnly,
      ...(expires ? { expires } : {})
    };
  };

  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      const norm = normalizeItem(item);
      if (norm) result.push(norm);
    }
  } else if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.cookies)) {
      for (const item of parsed.cookies) {
        const norm = normalizeItem(item);
        if (norm) result.push(norm);
      }
    } else {
      // Key-value object: { "c_user": "...", "xs": "..." }
      for (const [key, val] of Object.entries(parsed)) {
        if (val !== undefined && val !== null && (typeof val === 'string' || typeof val === 'number')) {
          result.push({
            name: key.trim(),
            value: String(val).trim(),
            domain: defaultDomain,
            path: '/',
            secure: true,
            httpOnly: ['xs', 'fr', 'datr', 'sb'].includes(key.trim())
          });
        }
      }
    }
  }

  // If still empty and input is a string, fallback to standard cookie header format "k=v; k2=v2"
  if (result.length === 0 && typeof input === 'string') {
    const pairs = input.split(';');
    for (const pair of pairs) {
      const splitIdx = pair.indexOf('=');
      if (splitIdx !== -1) {
        const key = pair.slice(0, splitIdx).trim();
        const val = pair.slice(splitIdx + 1).trim();
        if (key && val) {
          result.push({
            name: key,
            value: val,
            domain: defaultDomain,
            path: '/',
            secure: true,
            httpOnly: ['xs', 'fr', 'datr', 'sb'].includes(key)
          });
        }
      }
    }
  }

  return result;
}
