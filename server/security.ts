import crypto from 'node:crypto';

const TOKEN_TTL_SECONDS = 60 * 60 * 8;
const secret = () => process.env.AUTH_SECRET || process.env.SESSION_SECRET || '';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, stored?: string): boolean {
  if (!stored) return false;
  if (stored.startsWith('scrypt$')) {
    try {
      const [, salt, expected] = stored.split('$');
      if (!salt || !expected) return false;
      const actual = crypto.scryptSync(password, salt, 64);
      const expectedBuffer = Buffer.from(expected, 'hex');
      return actual.length === expectedBuffer.length && crypto.timingSafeEqual(actual, expectedBuffer);
    } catch { return false; }
  }
  // Legacy plaintext passwords are accepted once so existing accounts can migrate on login.
  const supplied = Buffer.from(password);
  const legacy = Buffer.from(stored);
  return supplied.length === legacy.length && crypto.timingSafeEqual(supplied, legacy);
}

export function issueToken(user: { id: string; role: string; name: string }): string {
  if (!secret()) throw new Error('AUTH_SECRET must be configured before issuing sessions.');
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ sub: user.id, role: user.role, name: user.name, iat: now, exp: now + TOKEN_TTL_SECONDS })).toString('base64url');
  const content = `${header}.${payload}`;
  const signature = crypto.createHmac('sha256', secret()).update(content).digest('base64url');
  return `${content}.${signature}`;
}

export function verifyToken(token: string): { sub: string; role: string; name: string } | null {
  try {
    if (!secret()) return null;
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature) return null;
    const content = `${header}.${payload}`;
    const expected = crypto.createHmac('sha256', secret()).update(content).digest();
    const actual = Buffer.from(signature, 'base64url');
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.sub || !data.role || !data.exp || data.exp <= Math.floor(Date.now() / 1000)) return null;
    return { sub: data.sub, role: data.role, name: data.name };
  } catch { return null; }
}
