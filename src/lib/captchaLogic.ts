import crypto from 'node:crypto';

const CAPTCHA_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const CAPTCHA_TTL_MS = 10 * 60 * 1000;

interface StoredChallenge {
  code: string;
  expiresAt: number;
}

const activeChallenges = new Map<string, StoredChallenge>();

function pruneExpiredChallenges(now = Date.now()): void {
  for (const [id, entry] of activeChallenges.entries()) {
    if (entry.expiresAt <= now) {
      activeChallenges.delete(id);
    }
  }
}

export function generateCaptchaCode(length = 5): string {
  const safeLen = Math.max(4, Math.min(8, Math.floor(length)));
  const bytes = crypto.randomBytes(safeLen);
  let code = '';
  for (let i = 0; i < safeLen; i += 1) {
    code += CAPTCHA_ALPHABET[bytes[i] % CAPTCHA_ALPHABET.length];
  }
  return code;
}

export function renderCaptchaSvg(code: string): string {
  const width = 200;
  const height = 58;
  const palette = ['#0F294A', '#B45309', '#047857', '#1D4ED8', '#7C2D12'];

  const charElements = code
    .split('')
    .map((ch, idx) => {
      const x = 22 + idx * 34 + (crypto.randomInt(7) - 3);
      const y = 38 + (crypto.randomInt(9) - 4);
      const angle = crypto.randomInt(35) - 17;
      const color = palette[(idx + crypto.randomInt(palette.length)) % palette.length];
      return `<text x="${x}" y="${y}" font-family="'Courier New', monospace" font-size="27" font-weight="800" fill="${color}" transform="rotate(${angle} ${x} ${y})">${ch}</text>`;
    })
    .join('');

  const noiseLines = Array.from({ length: 6 }, () => {
    const x1 = crypto.randomInt(width);
    const y1 = crypto.randomInt(height);
    const x2 = crypto.randomInt(width);
    const y2 = crypto.randomInt(height);
    const stroke = palette[crypto.randomInt(palette.length)];
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-opacity="0.28" stroke-width="1.4" />`;
  }).join('');

  const noiseDots = Array.from({ length: 18 }, () => {
    const cx = crypto.randomInt(width);
    const cy = crypto.randomInt(height);
    return `<circle cx="${cx}" cy="${cy}" r="1.3" fill="#64748B" fill-opacity="0.35" />`;
  }).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Security CAPTCHA"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#F8FAFC"/><stop offset="100%" stop-color="#EFF4FA"/></linearGradient></defs><rect width="100%" height="100%" rx="8" fill="url(#bg)" stroke="#CBD5E1" stroke-width="1"/>${noiseLines}${noiseDots}${charElements}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
}

export function createCaptchaChallenge(): {
  challengeId: string;
  svgDataUrl: string;
  expiresAt: string;
} {
  const now = Date.now();
  pruneExpiredChallenges(now);
  if (activeChallenges.size > 500) {
    const oldestKey = activeChallenges.keys().next().value;
    if (oldestKey) activeChallenges.delete(oldestKey);
  }
  const challengeId = crypto.randomBytes(12).toString('hex');
  const code = generateCaptchaCode(5);
  const expiresAtMs = now + CAPTCHA_TTL_MS;
  activeChallenges.set(challengeId, { code, expiresAt: expiresAtMs });
  return {
    challengeId,
    svgDataUrl: renderCaptchaSvg(code),
    expiresAt: new Date(expiresAtMs).toISOString(),
  };
}

export function verifyCaptchaChallenge(
  challengeId: unknown,
  answer: unknown,
): { valid: boolean; reason?: string } {
  const now = Date.now();
  pruneExpiredChallenges(now);
  const id = typeof challengeId === 'string' ? challengeId.trim() : '';
  const rawAnswer = typeof answer === 'string' ? answer.trim().toUpperCase() : '';
  if (!id || !rawAnswer) {
    return { valid: false, reason: 'Please enter the security CAPTCHA characters shown.' };
  }
  const entry = activeChallenges.get(id);
  activeChallenges.delete(id);
  if (!entry || entry.expiresAt <= now) {
    return { valid: false, reason: 'CAPTCHA expired or invalid. Please solve the refreshed CAPTCHA.' };
  }
  if (entry.code !== rawAnswer) {
    return { valid: false, reason: 'Incorrect CAPTCHA code. Please try the refreshed code.' };
  }
  return { valid: true };
}
