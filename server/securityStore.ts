import { Pool } from 'pg';
import { db, getDbTimestamp } from './db';

export type StoredSession = {
  token: string;
  user_id: string;
  created_at: string;
  expires_at: string;
  csrf_token: string;
  recent_auth_at: string;
  user_agent: string;
  device_label: string;
  location_label: string;
  last_seen_at: string;
  trusted_device_id: string | null;
};

export type StoredTrustedDevice = {
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

export type StoredSecurityEvent = {
  id: number;
  type: string;
  title: string;
  device_label: string;
  location_label: string;
  created_at: string;
  is_alert: number;
};

export type StoredTwoFactor = {
  user_id: string;
  secret: string | null;
  pending_secret: string | null;
  backup_codes_json: string | null;
  enabled: number;
  updated_at: string;
};

export type StoredPasskey = {
  id: string;
  user_id: string;
  label: string;
  public_key_b64: string;
  counter: number;
  device_type: 'singleDevice' | 'multiDevice';
  backed_up: number;
  transports_json: string | null;
  created_at: string;
  last_used_at: string;
};

type SecurityStore = {
  kind: 'sqlite' | 'postgres';
  init: () => Promise<void>;
  ping: () => Promise<void>;
  close: () => Promise<void>;
  findSessionByToken: (token: string) => Promise<StoredSession | undefined>;
  listSessionsByUserId: (userId: string) => Promise<StoredSession[]>;
  findSessionDeviceSummary: (token: string) => Promise<{ device_label: string; created_at: string } | undefined>;
  updateRotatedSession: (token: string, input: {
    userAgent: string;
    deviceLabel: string;
    locationLabel: string;
    trustedDeviceId?: string | null;
    recentAuthAt?: string;
  }) => Promise<void>;
  clearTrustedDeviceForUser: (userId: string) => Promise<void>;
  deleteSessionForUser: (token: string, userId: string) => Promise<void>;
  listTrustedDevicesByUserId: (userId: string) => Promise<StoredTrustedDevice[]>;
  deleteTrustedDevicesForUser: (userId: string) => Promise<void>;
  listSecurityEventsByUserId: (userId: string) => Promise<StoredSecurityEvent[]>;
  ensureTwoFactorRecord: (userId: string) => Promise<void>;
  findTwoFactorRow: (userId: string) => Promise<StoredTwoFactor | undefined>;
  updateTwoFactorPendingSecret: (userId: string, secret: string) => Promise<void>;
  enableTwoFactor: (userId: string, secret: string, backupCodeHashesJson: string) => Promise<void>;
  disableTwoFactor: (userId: string) => Promise<void>;
  updateBackupCodes: (userId: string, backupCodeHashesJson: string) => Promise<void>;
  listPasskeysByUserId: (userId: string) => Promise<StoredPasskey[]>;
  findPasskeyByIdAndUserId: (passkeyId: string, userId: string) => Promise<StoredPasskey | undefined>;
  upsertPasskey: (input: {
    id: string;
    userId: string;
    label: string;
    publicKeyB64: string;
    counter: number;
    deviceType: string;
    backedUp: boolean;
    transportsJson: string;
  }) => Promise<void>;
  updatePasskeyUsage: (passkeyId: string, counter: number, backedUp: boolean) => Promise<void>;
  deletePasskey: (passkeyId: string, userId: string) => Promise<void>;
  countTrustedDevices: (userId: string) => Promise<number>;
  countPasskeys: (userId: string) => Promise<number>;
  getUserEmailVerificationState: (userId: string) => Promise<{ is_email_verified: number } | undefined>;
  createSecurityEvent: (userId: string, type: string, title: string, metadata: {
    deviceLabel: string;
    locationLabel: string;
    isAlert?: boolean;
    metadataJson?: string | null;
  }) => Promise<void>;
};

function now() {
  return getDbTimestamp();
}

function toInt(value: string | number) {
  return typeof value === 'number' ? value : Number(value);
}

function createSqliteStore(): SecurityStore {
  return {
    kind: 'sqlite',
    init: async () => {},
    ping: async () => {
      db.prepare('SELECT 1').get();
    },
    close: async () => {},

    async findSessionByToken(token) {
      return db.prepare(`
        SELECT token, user_id, created_at, expires_at, csrf_token, recent_auth_at, user_agent, device_label, location_label, last_seen_at, trusted_device_id
        FROM sessions
        WHERE token = ?
      `).get(token) as StoredSession | undefined;
    },

    async listSessionsByUserId(userId) {
      return db.prepare(`
        SELECT token, user_id, created_at, expires_at, csrf_token, recent_auth_at, user_agent, device_label, location_label, last_seen_at, trusted_device_id
        FROM sessions
        WHERE user_id = ?
        ORDER BY last_seen_at DESC
      `).all(userId) as StoredSession[];
    },

    async findSessionDeviceSummary(token) {
      return db.prepare('SELECT device_label, created_at FROM sessions WHERE token = ?').get(token) as { device_label: string; created_at: string } | undefined;
    },

    async updateRotatedSession(token, input) {
      db.prepare(`
        UPDATE sessions
        SET user_agent = ?, device_label = ?, location_label = ?, last_seen_at = ?, trusted_device_id = ?, recent_auth_at = ?
        WHERE token = ?
      `).run(
        input.userAgent,
        input.deviceLabel,
        input.locationLabel,
        now(),
        input.trustedDeviceId ?? null,
        input.recentAuthAt ?? now(),
        token,
      );
    },

    async clearTrustedDeviceForUser(userId) {
      db.prepare('UPDATE sessions SET trusted_device_id = NULL WHERE user_id = ?').run(userId);
    },

    async deleteSessionForUser(token, userId) {
      db.prepare('DELETE FROM sessions WHERE token = ? AND user_id = ?').run(token, userId);
    },

    async listTrustedDevicesByUserId(userId) {
      return db.prepare(`
        SELECT id, user_id, device_label, browser, platform, location_label, created_at, last_used_at, expires_at
        FROM trusted_devices
        WHERE user_id = ?
        ORDER BY last_used_at DESC
      `).all(userId) as StoredTrustedDevice[];
    },

    async deleteTrustedDevicesForUser(userId) {
      db.prepare('DELETE FROM trusted_devices WHERE user_id = ?').run(userId);
    },

    async listSecurityEventsByUserId(userId) {
      return db.prepare(`
        SELECT id, type, title, device_label, location_label, created_at, is_alert
        FROM security_events
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 50
      `).all(userId) as StoredSecurityEvent[];
    },

    async ensureTwoFactorRecord(userId) {
      db.prepare(`
        INSERT OR IGNORE INTO two_factor_credentials (user_id, enabled, updated_at)
        VALUES (?, 0, ?)
      `).run(userId, now());
    },

    async findTwoFactorRow(userId) {
      return db.prepare('SELECT * FROM two_factor_credentials WHERE user_id = ?').get(userId) as StoredTwoFactor | undefined;
    },

    async updateTwoFactorPendingSecret(userId, secret) {
      db.prepare('UPDATE two_factor_credentials SET pending_secret = ?, updated_at = ? WHERE user_id = ?')
        .run(secret, now(), userId);
    },

    async enableTwoFactor(userId, secret, backupCodeHashesJson) {
      db.prepare(`
        UPDATE two_factor_credentials
        SET secret = ?, pending_secret = NULL, enabled = 1, backup_codes_json = ?, updated_at = ?
        WHERE user_id = ?
      `).run(secret, backupCodeHashesJson, now(), userId);
    },

    async disableTwoFactor(userId) {
      db.prepare(`
        UPDATE two_factor_credentials
        SET secret = NULL, pending_secret = NULL, enabled = 0, backup_codes_json = NULL, updated_at = ?
        WHERE user_id = ?
      `).run(now(), userId);
    },

    async updateBackupCodes(userId, backupCodeHashesJson) {
      db.prepare('UPDATE two_factor_credentials SET backup_codes_json = ?, updated_at = ? WHERE user_id = ?')
        .run(backupCodeHashesJson, now(), userId);
    },

    async listPasskeysByUserId(userId) {
      return db.prepare(`
        SELECT id, user_id, label, public_key_b64, counter, device_type, backed_up, transports_json, created_at, last_used_at
        FROM passkeys
        WHERE user_id = ?
        ORDER BY created_at DESC
      `).all(userId) as StoredPasskey[];
    },

    async findPasskeyByIdAndUserId(passkeyId, userId) {
      return db.prepare(`
        SELECT id, user_id, label, public_key_b64, counter, device_type, backed_up, transports_json, created_at, last_used_at
        FROM passkeys
        WHERE id = ? AND user_id = ?
      `).get(passkeyId, userId) as StoredPasskey | undefined;
    },

    async upsertPasskey(input) {
      db.prepare(`
        INSERT OR REPLACE INTO passkeys (
          id, user_id, label, public_key_b64, counter, device_type, backed_up, transports_json, created_at, last_used_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        input.id,
        input.userId,
        input.label,
        input.publicKeyB64,
        input.counter,
        input.deviceType,
        input.backedUp ? 1 : 0,
        input.transportsJson,
        now(),
        now(),
      );
    },

    async updatePasskeyUsage(passkeyId, counter, backedUp) {
      db.prepare(`
        UPDATE passkeys
        SET counter = ?, last_used_at = ?, backed_up = ?
        WHERE id = ?
      `).run(counter, now(), backedUp ? 1 : 0, passkeyId);
    },

    async deletePasskey(passkeyId, userId) {
      db.prepare('DELETE FROM passkeys WHERE id = ? AND user_id = ?').run(passkeyId, userId);
    },

    async countTrustedDevices(userId) {
      const row = db.prepare('SELECT COUNT(*) as count FROM trusted_devices WHERE user_id = ?').get(userId) as { count: number };
      return row.count;
    },

    async countPasskeys(userId) {
      const row = db.prepare('SELECT COUNT(*) as count FROM passkeys WHERE user_id = ?').get(userId) as { count: number };
      return row.count;
    },

    async getUserEmailVerificationState(userId) {
      return db.prepare('SELECT is_email_verified FROM users WHERE id = ?').get(userId) as { is_email_verified: number } | undefined;
    },

    async createSecurityEvent(userId, type, title, metadata) {
      db.prepare(`
        INSERT INTO security_events (user_id, type, title, device_label, location_label, created_at, is_alert, metadata_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        type,
        title,
        metadata.deviceLabel,
        metadata.locationLabel,
        now(),
        metadata.isAlert ? 1 : 0,
        metadata.metadataJson ?? null,
      );
    },
  };
}

function createPostgresStore(databaseUrl: string): SecurityStore {
  const pool = new Pool({ connectionString: databaseUrl });

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
        CREATE TABLE IF NOT EXISTS two_factor_credentials (
          user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          secret TEXT,
          pending_secret TEXT,
          backup_codes_json TEXT,
          enabled INTEGER NOT NULL DEFAULT 0,
          updated_at TIMESTAMPTZ NOT NULL
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS security_events (
          id BIGSERIAL PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          device_label TEXT NOT NULL,
          location_label TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL,
          is_alert INTEGER NOT NULL DEFAULT 0,
          metadata_json TEXT
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS passkeys (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          label TEXT NOT NULL,
          public_key_b64 TEXT NOT NULL,
          counter BIGINT NOT NULL DEFAULT 0,
          device_type TEXT NOT NULL,
          backed_up INTEGER NOT NULL DEFAULT 0,
          transports_json TEXT,
          created_at TIMESTAMPTZ NOT NULL,
          last_used_at TIMESTAMPTZ NOT NULL
        );
      `);
      await pool.query('CREATE INDEX IF NOT EXISTS idx_security_events_user_created_pg ON security_events(user_id, created_at DESC)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_passkeys_user_id_pg ON passkeys(user_id)');
    },

    async findSessionByToken(token) {
      const result = await pool.query<StoredSession>(`
        SELECT
          token, user_id, created_at::text, expires_at::text, csrf_token, recent_auth_at::text,
          user_agent, device_label, location_label, last_seen_at::text, trusted_device_id
        FROM sessions
        WHERE token = $1
      `, [token]);
      return result.rows[0];
    },

    async listSessionsByUserId(userId) {
      const result = await pool.query<StoredSession>(`
        SELECT
          token, user_id, created_at::text, expires_at::text, csrf_token, recent_auth_at::text,
          user_agent, device_label, location_label, last_seen_at::text, trusted_device_id
        FROM sessions
        WHERE user_id = $1
        ORDER BY last_seen_at DESC
      `, [userId]);
      return result.rows;
    },

    async findSessionDeviceSummary(token) {
      const result = await pool.query<{ device_label: string; created_at: string }>(
        'SELECT device_label, created_at::text FROM sessions WHERE token = $1',
        [token],
      );
      return result.rows[0];
    },

    async updateRotatedSession(token, input) {
      await pool.query(`
        UPDATE sessions
        SET
          user_agent = $1,
          device_label = $2,
          location_label = $3,
          last_seen_at = NOW(),
          trusted_device_id = $4,
          recent_auth_at = $5::timestamptz
        WHERE token = $6
      `, [
        input.userAgent,
        input.deviceLabel,
        input.locationLabel,
        input.trustedDeviceId ?? null,
        input.recentAuthAt ?? now(),
        token,
      ]);
    },

    async clearTrustedDeviceForUser(userId) {
      await pool.query('UPDATE sessions SET trusted_device_id = NULL WHERE user_id = $1', [userId]);
    },

    async deleteSessionForUser(token, userId) {
      await pool.query('DELETE FROM sessions WHERE token = $1 AND user_id = $2', [token, userId]);
    },

    async listTrustedDevicesByUserId(userId) {
      const result = await pool.query<StoredTrustedDevice>(`
        SELECT
          id, user_id, device_label, browser, platform, location_label,
          created_at::text, last_used_at::text, expires_at::text
        FROM trusted_devices
        WHERE user_id = $1
        ORDER BY last_used_at DESC
      `, [userId]);
      return result.rows;
    },

    async deleteTrustedDevicesForUser(userId) {
      await pool.query('DELETE FROM trusted_devices WHERE user_id = $1', [userId]);
    },

    async listSecurityEventsByUserId(userId) {
      const result = await pool.query<Array<{ id: string | number; type: string; title: string; device_label: string; location_label: string; created_at: string; is_alert: string | number }>[number]>(`
        SELECT id, type, title, device_label, location_label, created_at::text, is_alert
        FROM security_events
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 50
      `, [userId]);
      return result.rows.map((row) => ({
        ...row,
        id: toInt(row.id),
        is_alert: toInt(row.is_alert),
      }));
    },

    async ensureTwoFactorRecord(userId) {
      await pool.query(`
        INSERT INTO two_factor_credentials (user_id, enabled, updated_at)
        VALUES ($1, 0, NOW())
        ON CONFLICT (user_id) DO NOTHING
      `, [userId]);
    },

    async findTwoFactorRow(userId) {
      const result = await pool.query<StoredTwoFactor>(`
        SELECT user_id, secret, pending_secret, backup_codes_json, enabled, updated_at::text
        FROM two_factor_credentials
        WHERE user_id = $1
      `, [userId]);
      return result.rows[0];
    },

    async updateTwoFactorPendingSecret(userId, secret) {
      await pool.query('UPDATE two_factor_credentials SET pending_secret = $1, updated_at = NOW() WHERE user_id = $2', [secret, userId]);
    },

    async enableTwoFactor(userId, secret, backupCodeHashesJson) {
      await pool.query(`
        UPDATE two_factor_credentials
        SET secret = $1, pending_secret = NULL, enabled = 1, backup_codes_json = $2, updated_at = NOW()
        WHERE user_id = $3
      `, [secret, backupCodeHashesJson, userId]);
    },

    async disableTwoFactor(userId) {
      await pool.query(`
        UPDATE two_factor_credentials
        SET secret = NULL, pending_secret = NULL, enabled = 0, backup_codes_json = NULL, updated_at = NOW()
        WHERE user_id = $1
      `, [userId]);
    },

    async updateBackupCodes(userId, backupCodeHashesJson) {
      await pool.query('UPDATE two_factor_credentials SET backup_codes_json = $1, updated_at = NOW() WHERE user_id = $2', [backupCodeHashesJson, userId]);
    },

    async listPasskeysByUserId(userId) {
      const result = await pool.query<Array<{ id: string; user_id: string; label: string; public_key_b64: string; counter: string | number; device_type: 'singleDevice' | 'multiDevice'; backed_up: string | number; transports_json: string | null; created_at: string; last_used_at: string }>[number]>(`
        SELECT
          id, user_id, label, public_key_b64, counter, device_type, backed_up, transports_json,
          created_at::text, last_used_at::text
        FROM passkeys
        WHERE user_id = $1
        ORDER BY created_at DESC
      `, [userId]);
      return result.rows.map((row) => ({
        ...row,
        counter: toInt(row.counter),
        backed_up: toInt(row.backed_up),
      }));
    },

    async findPasskeyByIdAndUserId(passkeyId, userId) {
      const result = await pool.query<Array<{ id: string; user_id: string; label: string; public_key_b64: string; counter: string | number; device_type: 'singleDevice' | 'multiDevice'; backed_up: string | number; transports_json: string | null; created_at: string; last_used_at: string }>[number]>(`
        SELECT
          id, user_id, label, public_key_b64, counter, device_type, backed_up, transports_json,
          created_at::text, last_used_at::text
        FROM passkeys
        WHERE id = $1 AND user_id = $2
      `, [passkeyId, userId]);
      const row = result.rows[0];
      return row
        ? {
            ...row,
            counter: toInt(row.counter),
            backed_up: toInt(row.backed_up),
          }
        : undefined;
    },

    async upsertPasskey(input) {
      await pool.query(`
        INSERT INTO passkeys (
          id, user_id, label, public_key_b64, counter, device_type, backed_up, transports_json, created_at, last_used_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          label = EXCLUDED.label,
          public_key_b64 = EXCLUDED.public_key_b64,
          counter = EXCLUDED.counter,
          device_type = EXCLUDED.device_type,
          backed_up = EXCLUDED.backed_up,
          transports_json = EXCLUDED.transports_json,
          last_used_at = NOW()
      `, [
        input.id,
        input.userId,
        input.label,
        input.publicKeyB64,
        input.counter,
        input.deviceType,
        input.backedUp ? 1 : 0,
        input.transportsJson,
      ]);
    },

    async updatePasskeyUsage(passkeyId, counter, backedUp) {
      await pool.query(`
        UPDATE passkeys
        SET counter = $1, last_used_at = NOW(), backed_up = $2
        WHERE id = $3
      `, [counter, backedUp ? 1 : 0, passkeyId]);
    },

    async deletePasskey(passkeyId, userId) {
      await pool.query('DELETE FROM passkeys WHERE id = $1 AND user_id = $2', [passkeyId, userId]);
    },

    async countTrustedDevices(userId) {
      const result = await pool.query<{ count: string | number }>('SELECT COUNT(*) as count FROM trusted_devices WHERE user_id = $1', [userId]);
      return toInt(result.rows[0]?.count ?? 0);
    },

    async countPasskeys(userId) {
      const result = await pool.query<{ count: string | number }>('SELECT COUNT(*) as count FROM passkeys WHERE user_id = $1', [userId]);
      return toInt(result.rows[0]?.count ?? 0);
    },

    async getUserEmailVerificationState(userId) {
      const result = await pool.query<{ is_email_verified: string | number }>('SELECT is_email_verified FROM users WHERE id = $1', [userId]);
      const row = result.rows[0];
      return row ? { is_email_verified: toInt(row.is_email_verified) } : undefined;
    },

    async createSecurityEvent(userId, type, title, metadata) {
      await pool.query(`
        INSERT INTO security_events (
          user_id, type, title, device_label, location_label, created_at, is_alert, metadata_json
        ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7)
      `, [
        userId,
        type,
        title,
        metadata.deviceLabel,
        metadata.locationLabel,
        metadata.isAlert ? 1 : 0,
        metadata.metadataJson ?? null,
      ]);
    },
  };
}

const usePostgresAppStore = process.env.ENABLE_POSTGRES_APP_STORE === '1' && process.env.DATABASE_URL;

export const securityStore = usePostgresAppStore
  ? createPostgresStore(process.env.DATABASE_URL!)
  : createSqliteStore();
