import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Ephemeral HMAC key if SESSION_SECRET is unset in env
const SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16
    ? Buffer.from(process.env.SESSION_SECRET, 'utf8')
    : crypto.randomBytes(32);

const PIN_SALT = 'fh_lmtd_dev_salt_v1';
const DEFAULT_PIN_SCRYPT_HEX =
  'f44438e14788e3b6ea7f90ee0b44cc9830b2dbf7f9187d0a781ac70af5e75ac4';

interface RateEntry {
  failures: number;
  lockedUntil: number;
}
const rateLimitMap = new Map<string, RateEntry>();
const MAX_FAILURES = 5;
const LOCK_MS = 60_000;

function getClientKey(req: express.Request): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0].trim();
  }
  return req.ip || 'local';
}

function verifyDevPin(candidate: string): boolean {
  const envPin = process.env.DEV_PORTAL_PIN?.trim();
  if (envPin && envPin.length > 0) {
    const a = crypto.scryptSync(candidate, PIN_SALT, 32);
    const b = crypto.scryptSync(envPin, PIN_SALT, 32);
    return crypto.timingSafeEqual(a, b);
  }
  const candidateDigest = crypto.scryptSync(candidate, PIN_SALT, 32);
  const expectedDigest = Buffer.from(DEFAULT_PIN_SCRYPT_HEX, 'hex');
  return crypto.timingSafeEqual(candidateDigest, expectedDigest);
}

function signDevToken(): string {
  const payload = Buffer.from(
    JSON.stringify({
      scope: 'dev-portal',
      exp: Date.now() + 12 * 60 * 60 * 1000,
      nonce: crypto.randomBytes(8).toString('hex'),
    })
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

function verifyDevToken(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
  const a = Buffer.from(sig, 'utf8');
  const b = Buffer.from(expectedSig, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const parsed = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8')
    ) as { scope?: string; exp?: number };
    return (
      parsed.scope === 'dev-portal' &&
      typeof parsed.exp === 'number' &&
      parsed.exp > Date.now()
    );
  } catch {
    return false;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '16kb' }));

  app.post('/api/dev-portal/verify-pin', (req, res) => {
    const clientKey = getClientKey(req);
    const now = Date.now();
    const record = rateLimitMap.get(clientKey);
    if (record && record.lockedUntil > now) {
      const waitSecs = Math.ceil((record.lockedUntil - now) / 1000);
      res.status(429).json({
        ok: false,
        error: `Too many failed attempts. Retry in ${waitSecs}s.`,
      });
      return;
    }

    const pin = typeof req.body?.pin === 'string' ? req.body.pin.trim() : '';
    if (!/^\d{4,12}$/.test(pin)) {
      res.status(400).json({ ok: false, error: 'Enter a valid 4-digit PIN.' });
      return;
    }

    if (!verifyDevPin(pin)) {
      const nextFailures = (record?.failures ?? 0) + 1;
      rateLimitMap.set(clientKey, {
        failures: nextFailures,
        lockedUntil: nextFailures >= MAX_FAILURES ? now + LOCK_MS : 0,
      });
      res.status(401).json({ ok: false, error: 'Incorrect Developer PIN.' });
      return;
    }

    rateLimitMap.delete(clientKey);
    res.json({ ok: true, token: signDevToken() });
  });

  app.get('/api/dev-portal/session', (req, res) => {
    const authHeader = req.headers.authorization;
    const token =
      typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : '';
    if (!token || !verifyDevToken(token)) {
      res.status(401).json({ ok: false });
      return;
    }
    res.json({ ok: true });
  });

  const httpServer = http.createServer(app);

  if (IS_PRODUCTION) {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir, { extensions: ['html'] }));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  } else {
    const disableWatch =
      process.env.DISABLE_HMR === 'true' ||
      Boolean(process.env.K_SERVICE || process.env.APP_URL);
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        ws: { server: httpServer },
        watch: disableWatch ? null : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`FlightHub Lmtd server listening on port ${PORT}`);
  });
}

void startServer();
