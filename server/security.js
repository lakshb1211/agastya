import crypto from 'node:crypto';
import { SECRET_KEY, TOKEN_EXPIRY_DAYS } from './config.js';
import { findOne } from './db.js';
import { HttpError } from './errors.js';

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(password, salt, 100_000, 32, 'sha256');
  return salt.toString('hex') + ':' + key.toString('hex');
}

export function verifyPassword(stored, provided) {
  try {
    const [saltHex, keyHex] = stored.split(':');
    const key = Buffer.from(keyHex, 'hex');
    const newKey = crypto.pbkdf2Sync(provided, Buffer.from(saltHex, 'hex'), 100_000, key.length, 'sha256');
    return crypto.timingSafeEqual(key, newKey);
  } catch {
    return false;
  }
}

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
const sign = (msg) => crypto.createHmac('sha256', SECRET_KEY).update(msg).digest();

export function createAccessToken(userId, email, name) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64({ alg: 'HS256', typ: 'JWT' });
  const payload = b64({ sub: userId, email, name, iat: now, exp: now + TOKEN_EXPIRY_DAYS * 86400 });
  return `${header}.${payload}.${sign(`${header}.${payload}`).toString('base64url')}`;
}

export function decodeAccessToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, sig] = parts;
    const expected = sign(`${header}.${payload}`);
    const provided = Buffer.from(sig, 'base64url');
    if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.exp && Date.now() / 1000 > data.exp) return null;
    return data;
  } catch {
    return null;
  }
}

function publicUser(u) {
  return { id: u.id, email: u.email, name: u.name, grade: u.grade, created_at: u.created_at };
}

// Express middleware: sets req.user (or null) from a Bearer token
export function currentUserOptional(req, _res, next) {
  req.user = null;
  const [scheme, token] = (req.get('authorization') || '').split(' ');
  if (scheme && scheme.toLowerCase() === 'bearer' && token) {
    const payload = decodeAccessToken(token);
    if (payload && payload.sub) {
      const user = findOne('users', (u) => u.id === payload.sub);
      if (user) req.user = publicUser(user);
    }
  }
  next();
}

export function currentUserRequired(req, res, next) {
  currentUserOptional(req, res, () => {
    if (!req.user) return next(new HttpError(401, 'Authentication credentials are required or invalid.'));
    next();
  });
}

export { publicUser };
