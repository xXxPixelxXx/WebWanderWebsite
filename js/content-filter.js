/**
 * content-filter.js — Adult content filtering for WebWander submissions
 * Blocks submissions with banned keywords in URL, site name, or description.
 * Same keyword list as the WebWander extension for consistency.
 */

const BANNED_KEYWORDS = [
  // English
  'porn', 'porno', 'sex', 'xxx', 'hentai', 'cam', 'escort', 'nsfw', 'adult',
  'nude', 'naked', 'nudity', 'erotic', 'onlyfans', 'fansly', 'chaturbate',
  'stripchat', 'bongacams', 'xvideos', 'pornhub', 'xnxx', 'xhamster', 'redtube', 'youporn',
  // Spanish
  'pornografía', 'pornografia', 'sexo', 'adulto', 'desnudo', 'erótico', 'erotico',
  // French
  'pornographie', 'sexe', 'adulte', 'érotique', 'erotique',
  // German
  'erwachsene', 'nackt', 'erotisch',
  // Portuguese, Italian
  'pornografia', 'sexo', 'adulto', 'erótico', 'sesso', 'nudo', 'erotico',
  // Russian
  'порно', 'секс', 'эротика', 'для взрослых', 'голый',
  // Japanese
  'エロ', 'アダルト', 'ポルノ', '無修正', '成人', 'r18', 'エッチ', '同人',
  // Chinese
  '色情', '18禁', '无码', '黄漫', '本子',
  // Korean
  '포르노', '성인', '야동', '에로', '누드',
  // Arabic
  'إباحية', 'بورنو', 'سكس',
  // Hindi
  'पोर्न', 'सेक्स',
  // Dutch, Polish, Turkish, Vietnamese, Thai, Indonesian, Swedish, Greek, Czech, Hebrew, Persian
  'volwassen', 'naakt', 'seks', 'erotyka', 'yetişkin', 'çıplak', 'erotik',
  'khiêu dâm', 'người lớn', 'หนังโป๊', 'ผู้ใหญ่', 'dewasa', 'porr', 'vuxen', 'naken',
  'πορνό', 'σεξ', 'ερωτικό', 'dospělých', 'pro dospělé', 'פורנו', 'סקס', 'پورن', 'سکس',
];

const BANNED_KEYWORD_REGEX = new RegExp(
  BANNED_KEYWORDS.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
  'i'
);

function extractDomain(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const u = new URL(url.startsWith('http') ? url : 'https://' + url);
    return (u.hostname || '').toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

function containsBannedKeyword(text) {
  if (!text || typeof text !== 'string') return false;
  return BANNED_KEYWORD_REGEX.test(text);
}

/**
 * Check if a submission should be blocked for adult content.
 * Scans URL (domain + path), site name, and description.
 * @param {{ url: string; name: string; description?: string }} submission
 * @returns {{ blocked: boolean; reason?: string }}
 */
export function checkSubmission({ url, name, description }) {
  const urlStr = (url || '').trim();
  const domain = extractDomain(urlStr);
  if (domain && containsBannedKeyword(domain)) {
    return { blocked: true, reason: 'url_contains_banned_content' };
  }
  if (urlStr && containsBannedKeyword(urlStr)) {
    return { blocked: true, reason: 'url_contains_banned_content' };
  }
  const nameStr = (name || '').trim();
  if (nameStr && containsBannedKeyword(nameStr)) {
    return { blocked: true, reason: 'name_contains_banned_content' };
  }
  const descStr = (description || '').trim();
  if (descStr && containsBannedKeyword(descStr)) {
    return { blocked: true, reason: 'description_contains_banned_content' };
  }
  return { blocked: false };
}
