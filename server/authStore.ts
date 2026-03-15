import crypto from 'node:crypto';
import { Pool } from 'pg';
import { db, getDbTimestamp } from './db';

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;
const TRUSTED_DEVICE_TTL_MS = 1000 * 60 * 60 * 24 * 30;

type TrustedDeviceLookup = {
  id: string;
  user_id: string;
  device_label: string;
  browser: string;
  platform: string;
  location_label: string;
  created_at: string;
  last_used_at: string;
  expires_at: string;
};

type WebAuthnChallengeRecord = {
  user_id: string;
  challenge: string;
  expires_at: string;
};

type AuthStore = {
  kind: 'sqlite' | 'postgres';
  init: () => Promise<void>;
  ping: () => Promise<void>;
  close: () => Promise<void>;
  cleanupExpiredSessions: () => Promise<void>;
  cleanupExpiredActionTokens: () => Promise<void>;
  createSession: (userId: string, metadata?: {
    userAgent?: string;
    deviceLabel?: string;
    locationLabel?: string;
    trustedDeviceId?: string | null;
  }) => Promise<{ token: string; csrfToken: string; expiresAt: string }>;
  destroySession: (token: string) => Promise<void>;
  destroyOtherSessions: (userId: string, keepToken: string) => Promise<void>;
  destroyAllUserSessions: (userId: string) => Promise<void>;
  rotateSession: (currentToken: string, userId: string) => Promise<{ token: string; csrfToken: string; expiresAt: string }>;
  getSessionExpiry: () => Date;
  createEmailVerificationToken: (userId: string) => Promise<{ token: string; expiresAt: string }>;
  createPasswordResetToken: (userId: string) => Promise<{ token: string; expiresAt: string }>;
  consumeEmailVerificationToken: (token: string) => Promise<string | null>;
  consumePasswordResetToken: (token: string) => Promise<string | null>;
  createLoginChallenge: (userId: string) => Promise<{ token: string; expiresAt: string }>;
  consumeLoginChallenge: (token: string) => Promise<string | null>;
  touchSession: (token: string) => Promise<void>;
  markSessionRecentlyAuthenticated: (token: string) => Promise<void>;
  createTrustedDevice: (userId: string, metadata: {
    deviceLabel: string;
    browser: string;
    platform: string;
    locationLabel: string;
  }) => Promise<{ id: string; token: string; expiresAt: string }>;
  findTrustedDeviceByToken: (rawToken: string) => Promise<TrustedDeviceLookup | undefined>;
  touchTrustedDevice: (id: string) => Promise<void>;
  revokeTrustedDevice: (id: string, userId: string) => Promise<void>;
  createWebAuthnChallenge: (userId: string, challenge: string, type: 'registration' | 'authentication') => Promise<{ id: string; expiresAt: string }>;
  consumeWebAuthnChallenge: (id: string, type: 'registration' | 'authentication') => Promise<WebAuthnChallengeRecord | null>;
  createOpaqueId: () => string;
  now: () => string;
};

function now() {
  return getDbTimestamp();
}

function futureTimestamp(ttlMs: number) {
  return new Date(Date.now() + ttlMs).toISOString();
}

function hashTrustedDeviceToken(rawToken: string) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function createSqliteStore(): AuthStore {
  function createActionToken(table: 'email_verification_tokens' | 'password_reset_tokens', userId: string, ttlMs: number) {
    const token = crypto.randomUUID();
    const createdAt = now();
    const expiresAt = futureTimestamp(ttlMs);
    db.prepare(`DELETE FROM ${table} WHERE user_id = ?`).run(userId);
    db.prepare(`INSERT INTO ${table} (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`)
      .run(token, userId, expiresAt, createdAt);
    return { token, expiresAt };
  }

  async function consumeActionToken(table: 'email_verification_tokens' | 'password_reset_tokens', token: string) {
    const record = db.prepare(`SELECT user_id, expires_at FROM ${table} WHERE token = ?`).get(token) as { user_id: string; expires_at: string } | undefined;
    if (!record || new Date(record.expires_at).getTime() <= Date.now()) {
      db.prepare(`DELETE FROM ${table} WHERE token = ?`).run(token);
      return null;
    }
    db.prepare(`DELETE FROM ${table} WHERE token = ?`).run(token);
    return record.user_id;
  }

  return {
    kind: 'sqlite',
    init: async () => {},
    ping: async () => {
      db.prepare('SELECT 1').get();
    },
    close: async () => {},

    async cleanupExpiredSessions() {
      db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now());
    },

    async cleanupExpiredActionTokens() {
      const timestamp = now();
      db.prepare('DELETE FROM email_verification_tokens WHERE expires_at <= ?').run(timestamp);
      db.prepare('DELETE FROM password_reset_tokens WHERE expires_at <= ?').run(timestamp);
      db.prepare('DELETE FROM login_challenges WHERE expires_at <= ?').run(timestamp);
      db.prepare('DELETE FROM trusted_devices WHERE expires_at <= ?').run(timestamp);
      db.prepare('DELETE FROM webauthn_challenges WHERE expires_at <= ?').run(timestamp);
    },

    async createSession(userId, metadata) {
      const token = crypto.randomUUID();
      const createdAt = now();
      const expiresAt = futureTimestamp(SESSION_TTL_MS);
      const csrfToken = crypto.randomUUID();
      db.prepare(`
        INSERT INTO sessions (
          token, user_id, created_at, expires_at, csrf_token, recent_auth_at, user_agent, device_label,
          location_label, last_seen_at, trusted_device_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        token,
        userId,
        createdAt,
        expiresAt,
        csrfToken,
        createdAt,
        metadata?.userAgent ?? '',
        metadata?.deviceLabel ?? '',
        metadata?.locationLabel ?? '',
        createdAt,
        metadata?.trustedDeviceId ?? null,
      );
      return { token, csrfToken, expiresAt };
    },

    async destroySession(token) {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    },

    async destroyOtherSessions(userId, keepToken) {
      db.prepare('DELETE FROM sessions WHERE user_id = ? AND token != ?').run(userId, keepToken);
    },

    async destroyAllUserSessions(userId) {
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
    },

    async rotateSession(currentToken, userId) {
      await this.destroySession(currentToken);
      return this.createSession(userId);
    },

    getSessionExpiry() {
      return new Date(Date.now() + SESSION_TTL_MS);
    },

    async createEmailVerificationToken(userId) {
      return createActionToken('email_verification_tokens', userId, 1000 * 60 * 30);
    },

    async createPasswordResetToken(userId) {
      return createActionToken('password_reset_tokens', userId, 1000 * 60 * 30);
    },

    async consumeEmailVerificationToken(token) {
      return consumeActionToken('email_verification_tokens', token);
    },

    async consumePasswordResetToken(token) {
      return consumeActionToken('password_reset_tokens', token);
    },

    async createLoginChallenge(userId) {
      const token = crypto.randomUUID();
      const createdAt = now();
      const expiresAt = futureTimestamp(1000 * 60 * 10);
      db.prepare('INSERT INTO login_challenges (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
        .run(token, userId, expiresAt, createdAt);
      return { token, expiresAt };
    },

    async consumeLoginChallenge(token) {
      const record = db.prepare('SELECT user_id, expires_at FROM login_challenges WHERE token = ?').get(token) as { user_id: string; expires_at: string } | undefined;
      if (!record || new Date(record.expires_at).getTime() <= Date.now()) {
        db.prepare('DELETE FROM login_challenges WHERE token = ?').run(token);
        return null;
      }
      db.prepare('DELETE FROM login_challenges WHERE token = ?').run(token);
      return record.user_id;
    },

    async touchSession(token) {
      db.prepare('UPDATE sessions SET last_seen_at = ? WHERE token = ?').run(now(), token);
    },

    async markSessionRecentlyAuthenticated(token) {
      db.prepare('UPDATE sessions SET recent_auth_at = ? WHERE token = ?').run(now(), token);
    },

    async createTrustedDevice(userId, metadata) {
      const rawToken = crypto.randomUUID();
      const tokenHash = hashTrustedDeviceToken(rawToken);
      const id = crypto.randomUUID();
      const createdAt = now();
      const expiresAt = futureTimestamp(TRUSTED_DEVICE_TTL_MS);
      db.prepare(`
        INSERT INTO trusted_devices (
          id, user_id, token_hash, device_label, browser, platform, location_label,
          created_at, last_used_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        userId,
        tokenHash,
        metadata.deviceLabel,
        metadata.browser,
        metadata.platform,
        metadata.locationLabel,
        createdAt,
        createdAt,
        expiresAt,
      );
      return { id, token: rawToken, expiresAt };
    },

    async findTrustedDeviceByToken(rawToken) {
      const tokenHash = hashTrustedDeviceToken(rawToken);
      return db.prepare(`
        SELECT id, user_id, device_label, browser, platform, location_label, created_at, last_used_at, expires_at
        FROM trusted_devices
        WHERE token_hash = ?
      `).get(tokenHash) as TrustedDeviceLookup | undefined;
    },

    async touchTrustedDevice(id) {
      db.prepare('UPDATE trusted_devices SET last_used_at = ? WHERE id = ?').run(now(), id);
    },

    async revokeTrustedDevice(id, userId) {
      db.prepare('DELETE FROM trusted_devices WHERE id = ? AND user_id = ?').run(id, userId);
      db.prepare('DELETE FROM sessions WHERE trusted_device_id = ? AND user_id = ?').run(id, userId);
    },

    async createWebAuthnChallenge(userId, challenge, type) {
      const id = crypto.randomUUID();
      const createdAt = now();
      const expiresAt = futureTimestamp(1000 * 60 * 10);
      db.prepare('INSERT INTO webauthn_challenges (id, user_id, challenge, type, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(id, userId, challenge, type, expiresAt, createdAt);
      return { id, expiresAt };
    },

    async consumeWebAuthnChallenge(id, type) {
      const record = db.prepare('SELECT user_id, challenge, expires_at FROM webauthn_challenges WHERE id = ? AND type = ?').get(id, type) as WebAuthnChallengeRecord | undefined;
      if (!record || new Date(record.expires_at).getTime() <= Date.now()) {
        db.prepare('DELETE FROM webauthn_challenges WHERE id = ?').run(id);
        return null;
      }
      db.prepare('DELETE FROM webauthn_challenges WHERE id = ?').run(id);
      return record;
    },

    createOpaqueId() {
      return crypto.randomUUID();
    },

    now,
  };
}

function createPostgresStore(databaseUrl: string): AuthStore {
  const pool = new Pool({ connectionString: databaseUrl });

  async function createActionToken(table: 'email_verification_tokens' | 'password_reset_tokens', userId: string, ttlMs: number) {
    const token = crypto.randomUUID();
    const createdAt = now();
    const expiresAt = futureTimestamp(ttlMs);
    await pool.query(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
    await pool.query(`INSERT INTO ${table} (token, user_id, expires_at, created_at) VALUES ($1, $2, $3::timestamptz, $4::timestamptz)`, [
      token,
      userId,
      expiresAt,
      createdAt,
    ]);
    return { token, expiresAt };
  }

  async function consumeActionToken(table: 'email_verification_tokens' | 'password_reset_tokens', token: string) {
    const result = await pool.query<{ user_id: string; expires_at: string }>(`SELECT user_id, expires_at::text FROM ${table} WHERE token = $1`, [token]);
    const record = result.rows[0];
    if (!record || new Date(record.expires_at).getTime() <= Date.now()) {
      await pool.query(`DELETE FROM ${table} WHERE token = $1`, [token]);
      return null;
    }
    await pool.query(`DELETE FROM ${table} WHERE token = $1`, [token]);
    return record.user_id;
  }

  return {
    kind: 'postgres',
    ping: async () => {
      await pool.query('SELECT 1');
    },
    close: async () => {
      await pool.end();
    },

    async init() {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS sessions (
          token TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          csrf_token TEXT NOT NULL,
          recent_auth_at TIMESTAMPTZ NOT NULL,
          user_agent TEXT NOT NULL DEFAULT '',
          device_label TEXT NOT NULL DEFAULT '',
          location_label TEXT NOT NULL DEFAULT '',
          last_seen_at TIMESTAMPTZ NOT NULL,
          trusted_device_id TEXT
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS email_verification_tokens (
          token TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          token TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS login_challenges (
          token TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS trusted_devices (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token_hash TEXT NOT NULL UNIQUE,
          device_label TEXT NOT NULL,
          browser TEXT NOT NULL,
          platform TEXT NOT NULL,
          location_label TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL,
          last_used_at TIMESTAMPTZ NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS webauthn_challenges (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          challenge TEXT NOT NULL,
          type TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL
        );
      `);
      await pool.query('CREATE INDEX IF NOT EXISTS idx_sessions_user_id_pg ON sessions(user_id)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_sessions_expires_at_pg ON sessions(expires_at)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id_pg ON trusted_devices(user_id)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_user_id_pg ON webauthn_challenges(user_id)');
    },

    async cleanupExpiredSessions() {
      await pool.query('DELETE FROM sessions WHERE expires_at <= NOW()');
    },

    async cleanupExpiredActionTokens() {
      await pool.query('DELETE FROM email_verification_tokens WHERE expires_at <= NOW()');
      await pool.query('DELETE FROM password_reset_tokens WHERE expires_at <= NOW()');
      await pool.query('DELETE FROM login_challenges WHERE expires_at <= NOW()');
      await pool.query('DELETE FROM trusted_devices WHERE expires_at <= NOW()');
      await pool.query('DELETE FROM webauthn_challenges WHERE expires_at <= NOW()');
    },

    async createSession(userId, metadata) {
      const token = crypto.randomUUID();
      const createdAt = now();
      const expiresAt = futureTimestamp(SESSION_TTL_MS);
      const csrfToken = crypto.randomUUID();
      await pool.query(`
        INSERT INTO sessions (
          token, user_id, created_at, expires_at, csrf_token, recent_auth_at, user_agent, device_label,
          location_label, last_seen_at, trusted_device_id
        ) VALUES ($1, $2, $3::timestamptz, $4::timestamptz, $5, $3::timestamptz, $6, $7, $8, $3::timestamptz, $9)
      `, [
        token,
        userId,
        createdAt,
        expiresAt,
        csrfToken,
        metadata?.userAgent ?? '',
        metadata?.deviceLabel ?? '',
        metadata?.locationLabel ?? '',
        metadata?.trustedDeviceId ?? null,
      ]);
      return { token, csrfToken, expiresAt };
    },

    async destroySession(token) {
      await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
    },

    async destroyOtherSessions(userId, keepToken) {
      await pool.query('DELETE FROM sessions WHERE user_id = $1 AND token != $2', [userId, keepToken]);
    },

    async destroyAllUserSessions(userId) {
      await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
    },

    async rotateSession(currentToken, userId) {
      await this.destroySession(currentToken);
      return this.createSession(userId);
    },

    getSessionExpiry() {
      return new Date(Date.now() + SESSION_TTL_MS);
    },

    async createEmailVerificationToken(userId) {
      return createActionToken('email_verification_tokens', userId, 1000 * 60 * 30);
    },

    async createPasswordResetToken(userId) {
      return createActionToken('password_reset_tokens', userId, 1000 * 60 * 30);
    },

    async consumeEmailVerificationToken(token) {
      return consumeActionToken('email_verification_tokens', token);
    },

    async consumePasswordResetToken(token) {
      return consumeActionToken('password_reset_tokens', token);
    },

    async createLoginChallenge(userId) {
      const token = crypto.randomUUID();
      const createdAt = now();
      const expiresAt = futureTimestamp(1000 * 60 * 10);
      await pool.query(`
        INSERT INTO login_challenges (token, user_id, expires_at, created_at)
        VALUES ($1, $2, $3::timestamptz, $4::timestamptz)
      `, [token, userId, expiresAt, createdAt]);
      return { token, expiresAt };
    },

    async consumeLoginChallenge(token) {
      const result = await pool.query<{ user_id: string; expires_at: string }>(
        'SELECT user_id, expires_at::text FROM login_challenges WHERE token = $1',
        [token],
      );
      const record = result.rows[0];
      if (!record || new Date(record.expires_at).getTime() <= Date.now()) {
        await pool.query('DELETE FROM login_challenges WHERE token = $1', [token]);
        return null;
      }
      await pool.query('DELETE FROM login_challenges WHERE token = $1', [token]);
      return record.user_id;
    },

    async touchSession(token) {
      await pool.query('UPDATE sessions SET last_seen_at = NOW() WHERE token = $1', [token]);
    },

    async markSessionRecentlyAuthenticated(token) {
      await pool.query('UPDATE sessions SET recent_auth_at = NOW() WHERE token = $1', [token]);
    },

    async createTrustedDevice(userId, metadata) {
      const rawToken = crypto.randomUUID();
      const tokenHash = hashTrustedDeviceToken(rawToken);
      const id = crypto.randomUUID();
      const createdAt = now();
      const expiresAt = futureTimestamp(TRUSTED_DEVICE_TTL_MS);
      await pool.query(`
        INSERT INTO trusted_devices (
          id, user_id, token_hash, device_label, browser, platform, location_label,
          created_at, last_used_at, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $8::timestamptz, $9::timestamptz)
      `, [
        id,
        userId,
        tokenHash,
        metadata.deviceLabel,
        metadata.browser,
        metadata.platform,
        metadata.locationLabel,
        createdAt,
        expiresAt,
      ]);
      return { id, token: rawToken, expiresAt };
    },

    async findTrustedDeviceByToken(rawToken) {
      const tokenHash = hashTrustedDeviceToken(rawToken);
      const result = await pool.query<TrustedDeviceLookup>(`
        SELECT
          id, user_id, device_label, browser, platform, location_label,
          created_at::text, last_used_at::text, expires_at::text
        FROM trusted_devices
        WHERE token_hash = $1
      `, [tokenHash]);
      return result.rows[0];
    },

    async touchTrustedDevice(id) {
      await pool.query('UPDATE trusted_devices SET last_used_at = NOW() WHERE id = $1', [id]);
    },

    async revokeTrustedDevice(id, userId) {
      await pool.query('DELETE FROM trusted_devices WHERE id = $1 AND user_id = $2', [id, userId]);
      await pool.query('DELETE FROM sessions WHERE trusted_device_id = $1 AND user_id = $2', [id, userId]);
    },

    async createWebAuthnChallenge(userId, challenge, type) {
      const id = crypto.randomUUID();
      const createdAt = now();
      const expiresAt = futureTimestamp(1000 * 60 * 10);
      await pool.query(`
        INSERT INTO webauthn_challenges (id, user_id, challenge, type, expires_at, created_at)
        VALUES ($1, $2, $3, $4, $5::timestamptz, $6::timestamptz)
      `, [id, userId, challenge, type, expiresAt, createdAt]);
      return { id, expiresAt };
    },

    async consumeWebAuthnChallenge(id, type) {
      const result = await pool.query<WebAuthnChallengeRecord>(`
        SELECT user_id, challenge, expires_at::text
        FROM webauthn_challenges
        WHERE id = $1 AND type = $2
      `, [id, type]);
      const record = result.rows[0];
      if (!record || new Date(record.expires_at).getTime() <= Date.now()) {
        await pool.query('DELETE FROM webauthn_challenges WHERE id = $1', [id]);
        return null;
      }
      await pool.query('DELETE FROM webauthn_challenges WHERE id = $1', [id]);
      return record;
    },

    createOpaqueId() {
      return crypto.randomUUID();
    },

    now,
  };
}

const usePostgresAppStore = process.env.ENABLE_POSTGRES_APP_STORE === '1' && process.env.DATABASE_URL;

export const authStore = usePostgresAppStore
  ? createPostgresStore(process.env.DATABASE_URL!)
  : createSqliteStore();
