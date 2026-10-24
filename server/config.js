import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// Paths
export const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(SERVER_DIR, '..');
export const DIST_DIR = path.join(ROOT_DIR, 'dist');

dotenv.config({ path: path.join(ROOT_DIR, '.env'), quiet: true });

export const DATA_DIR = process.env.AGASTYA_DATA_DIR || path.join(ROOT_DIR, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
export const DB_PATH = process.env.AGASTYA_DB_PATH || path.join(DATA_DIR, 'agastya.json');

// Server
export const PORT = Number(process.env.PORT || 8000);
export const HOST = process.env.HOST || '0.0.0.0';

// CORS (only needed when the frontend is served from another origin, e.g. Vite dev)
export const CORS_ORIGINS = (
  process.env.CORS_ORIGINS ||
  'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173'
)
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Security
let secret = process.env.AGASTYA_SECRET_KEY;
if (!secret) {
  // Hosted platforms may not have the secret set yet: run with a per-process key
  // so the site works, at the cost of logging everyone out on restart.
  secret = crypto.randomBytes(32).toString('base64url');
  console.warn(
    '⚠ AGASTYA_SECRET_KEY is not set. Using a temporary key: logins reset when the server restarts.'
  );
}
export const SECRET_KEY = secret;
export const TOKEN_EXPIRY_DAYS = Number(process.env.AGASTYA_TOKEN_EXPIRY_DAYS || 30);

// AI Providers
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
export const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
// Tried in order when the primary model is overloaded or rate-limited (HTTP 503/429)
export const GEMINI_FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS || 'gemini-3.5-flash')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

// Upload limits
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB
export const MAX_PDF_PAGES = 150;

// Supported Languages
export const LANGUAGES = {
  english: 'English',
  hindi: 'Hindi',
  spanish: 'Spanish',
  french: 'French',
  chinese: 'Chinese',
};
export const LANG_ALIASES = {
  en: 'english',
  hi: 'hindi',
  es: 'spanish',
  fr: 'french',
  zh: 'chinese',
};
