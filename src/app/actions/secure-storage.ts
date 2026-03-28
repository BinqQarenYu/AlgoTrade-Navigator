'use server';

import { cookies } from 'next/headers';
import crypto from 'crypto';

// The encryption key must be 32 bytes (256 bits).
// In a real production app, this should be stored securely in an environment variable (e.g., process.env.ENCRYPTION_KEY).
// For the scope of this fix, we define a fallback key if not provided.
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
  ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex')
  : crypto.scryptSync('default_secure_secret_password', 'salt', 32);

const ALGORITHM = 'aes-256-gcm';
const SESSION_COOKIE_NAME = 'app_secure_session';

const SECURE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 30, // 30 days
};

function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decrypt(encryptedText: string): string {
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return '';

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption failed', error);
    return '';
  }
}

export interface ApiSessionData {
  apiProfiles?: any[];
  activeProfileId?: string | null;
  binanceIsConnected?: string;
  rateLimitThreshold?: string;
  coingeckoApiKey?: string | null;
  coinmarketcapApiKey?: string | null;
  geminiApiKey?: string | null;
  aiQuota?: string;
  telegramBotToken?: string | null;
  telegramChatId?: string | null;
}

export async function loadSecureSession(): Promise<ApiSessionData> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!cookie?.value) {
    return {};
  }

  const decryptedStr = decrypt(cookie.value);
  if (!decryptedStr) {
    return {};
  }

  try {
    return JSON.parse(decryptedStr);
  } catch (e) {
    return {};
  }
}

export async function saveSecureSession(updates: Partial<ApiSessionData>): Promise<void> {
  const currentSession = await loadSecureSession();
  const newSession = { ...currentSession, ...updates };

  const encryptedStr = encrypt(JSON.stringify(newSession));
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, encryptedStr, SECURE_COOKIE_OPTIONS);
}
