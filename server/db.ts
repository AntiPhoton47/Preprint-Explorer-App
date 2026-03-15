import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { MOCK_CHATS, MOCK_PREPRINTS, MOCK_USERS } from '../src/mockData';
import { applyMigrations } from './migrations';

const dataDir = path.resolve(process.cwd(), 'server', 'data');
const dbPath = path.join(dataDir, 'preprint-explorer.sqlite');

fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const TRUSTED_DEVICE_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const DEFAULT_ADMIN_EMAIL = process.env.INITIAL_ADMIN_EMAIL ?? 'aris.thorne@uzh.ch';

function hashPassword(password: string) {
  return bcrypt.hashSync(password, 12);
}

function toTimestamp() {
  return new Date().toISOString();
}

export function initDb() {
  applyMigrations(db);
  migrateLegacyPasswordHashes();
  cleanupExpiredSessions();
  cleanupExpiredActionTokens();

  seedUsers();
  seedSettings();
  seedFollows();
  seedChats();
}

function isLegacySha256Hash(value: string) {
  return /^[a-f0-9]{64}$/i.test(value);
}

function migrateLegacyPasswordHashes() {
  const users = db.prepare('SELECT id, password_hash FROM users').all() as Array<{ id: string; password_hash: string }>;
  const update = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
  users.forEach(user => {
    if (isLegacySha256Hash(user.password_hash)) {
      update.run(hashPassword('password123'), user.id);
    }
  });
}

function seedUsers() {
  const count = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (count.count > 0) {
    return;
  }

  const insert = db.prepare(`
    INSERT INTO users (
      id, name, email, password_hash, affiliation, institution_id, image_url, bio, title,
      is_email_verified, is_affiliation_verified, is_admin, created_at
    ) VALUES (
      @id, @name, @email, @password_hash, @affiliation, @institution_id, @image_url, @bio, @title,
      @is_email_verified, @is_affiliation_verified, @is_admin, @created_at
    )
  `);

  const passwordHash = hashPassword('password123');
  const now = toTimestamp();

  for (const user of MOCK_USERS) {
    insert.run({
      id: user.id,
      name: user.name,
      email: user.email ?? `${user.id}@example.com`,
      password_hash: passwordHash,
      affiliation: user.affiliation,
      institution_id: user.institutionId ?? null,
      image_url: user.imageUrl,
      bio: user.bio,
      title: user.affiliation,
      is_email_verified: user.isEmailVerified ? 1 : 0,
      is_affiliation_verified: user.isAffiliationVerified ? 1 : 0,
      is_admin: (user.email ?? `${user.id}@example.com`).toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase() ? 1 : 0,
      created_at: now,
    });
  }
}

function seedSettings() {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO user_settings (
      user_id, push_enabled, email_enabled, daily_digest, weekly_digest, new_publications,
      citation_alerts, product_updates, delivery_day
    ) VALUES (
      @user_id, 1, 1, 1, 1, 1, 1, 0, 'Friday'
    )
  `);

  const users = db.prepare('SELECT id FROM users').all() as Array<{ id: string }>;
  users.forEach(user => insert.run({ user_id: user.id }));
}

function seedFollows() {
  const count = db.prepare('SELECT COUNT(*) as count FROM follows').get() as { count: number };
  if (count.count > 0) {
    return;
  }

  const insert = db.prepare(`
    INSERT OR IGNORE INTO follows (follower_id, following_id, created_at)
    VALUES (?, ?, ?)
  `);
  const now = toTimestamp();
  insert.run('aris_thorne', 'prof_wilson', now);
}

function seedChats() {
  const count = db.prepare('SELECT COUNT(*) as count FROM chats').get() as { count: number };
  if (count.count > 0) {
    return;
  }

  const insertChat = db.prepare('INSERT INTO chats (created_at) VALUES (?)');
  const insertParticipant = db.prepare('INSERT INTO chat_participants (chat_id, user_id) VALUES (?, ?)');
  const insertMessage = db.prepare('INSERT INTO messages (chat_id, sender_id, text, created_at) VALUES (?, ?, ?, ?)');
  const now = toTimestamp();

  for (const chat of MOCK_CHATS) {
    const chatResult = insertChat.run(now);
    const chatId = Number(chatResult.lastInsertRowid);
    chat.participants.forEach(participant => insertParticipant.run(chatId, participant));
    chat.messages.forEach(message => {
      insertMessage.run(chatId, message.senderId, message.text, now);
    });
  }
}

export function createSession(userId: string, metadata?: {
  userAgent?: string;
  deviceLabel?: string;
  locationLabel?: string;
  trustedDeviceId?: string | null;
}) {
  const token = crypto.randomUUID();
  const createdAt = toTimestamp();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
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
}

export function destroySession(token: string) {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

export function destroyOtherSessions(userId: string, keepToken: string) {
  db.prepare('DELETE FROM sessions WHERE user_id = ? AND token != ?').run(userId, keepToken);
}

export function destroyAllUserSessions(userId: string) {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

export function hashUserPassword(password: string) {
  return hashPassword(password);
}

export function verifyUserPassword(password: string, hash: string) {
  return bcrypt.compareSync(password, hash);
}

export function getSessionExpiry() {
  return new Date(Date.now() + SESSION_TTL_MS);
}

export function rotateSession(currentToken: string, userId: string) {
  destroySession(currentToken);
  return createSession(userId);
}

export function cleanupExpiredSessions() {
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(toTimestamp());
}

export function cleanupExpiredActionTokens() {
  const now = toTimestamp();
  db.prepare('DELETE FROM email_verification_tokens WHERE expires_at <= ?').run(now);
  db.prepare('DELETE FROM password_reset_tokens WHERE expires_at <= ?').run(now);
  db.prepare('DELETE FROM login_challenges WHERE expires_at <= ?').run(now);
  db.prepare('DELETE FROM trusted_devices WHERE expires_at <= ?').run(now);
  db.prepare('DELETE FROM webauthn_challenges WHERE expires_at <= ?').run(now);
}

function createActionToken(table: 'email_verification_tokens' | 'password_reset_tokens', userId: string, ttlMs: number) {
  const token = crypto.randomUUID();
  const createdAt = toTimestamp();
  const expiresAt = new Date(Date.now() + ttlMs).toISOString();
  db.prepare(`DELETE FROM ${table} WHERE user_id = ?`).run(userId);
  db.prepare(`INSERT INTO ${table} (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`)
    .run(token, userId, expiresAt, createdAt);
  return { token, expiresAt };
}

export function createEmailVerificationToken(userId: string) {
  return createActionToken('email_verification_tokens', userId, 1000 * 60 * 30);
}

export function createPasswordResetToken(userId: string) {
  return createActionToken('password_reset_tokens', userId, 1000 * 60 * 30);
}

export function consumeEmailVerificationToken(token: string) {
  const record = db.prepare('SELECT user_id, expires_at FROM email_verification_tokens WHERE token = ?').get(token) as { user_id: string; expires_at: string } | undefined;
  if (!record || new Date(record.expires_at).getTime() <= Date.now()) {
    db.prepare('DELETE FROM email_verification_tokens WHERE token = ?').run(token);
    return null;
  }
  db.prepare('DELETE FROM email_verification_tokens WHERE token = ?').run(token);
  return record.user_id;
}

export function consumePasswordResetToken(token: string) {
  const record = db.prepare('SELECT user_id, expires_at FROM password_reset_tokens WHERE token = ?').get(token) as { user_id: string; expires_at: string } | undefined;
  if (!record || new Date(record.expires_at).getTime() <= Date.now()) {
    db.prepare('DELETE FROM password_reset_tokens WHERE token = ?').run(token);
    return null;
  }
  db.prepare('DELETE FROM password_reset_tokens WHERE token = ?').run(token);
  return record.user_id;
}

export function ensureTwoFactorRecord(userId: string) {
  db.prepare(`
    INSERT OR IGNORE INTO two_factor_credentials (user_id, enabled, updated_at)
    VALUES (?, 0, ?)
  `).run(userId, toTimestamp());
}

export function createLoginChallenge(userId: string) {
  const token = crypto.randomUUID();
  const createdAt = toTimestamp();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 10).toISOString();
  db.prepare('INSERT INTO login_challenges (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
    .run(token, userId, expiresAt, createdAt);
  return { token, expiresAt };
}

export function touchSession(token: string) {
  db.prepare('UPDATE sessions SET last_seen_at = ? WHERE token = ?').run(toTimestamp(), token);
}

export function markSessionRecentlyAuthenticated(token: string) {
  db.prepare('UPDATE sessions SET recent_auth_at = ? WHERE token = ?').run(toTimestamp(), token);
}

export function createTrustedDevice(userId: string, metadata: {
  deviceLabel: string;
  browser: string;
  platform: string;
  locationLabel: string;
}) {
  const rawToken = crypto.randomUUID();
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const id = crypto.randomUUID();
  const createdAt = toTimestamp();
  const expiresAt = new Date(Date.now() + TRUSTED_DEVICE_TTL_MS).toISOString();
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
}

export function findTrustedDeviceByToken(rawToken: string) {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  return db.prepare(`
    SELECT id, user_id, device_label, browser, platform, location_label, created_at, last_used_at, expires_at
    FROM trusted_devices
    WHERE token_hash = ?
  `).get(tokenHash) as {
    id: string;
    user_id: string;
    device_label: string;
    browser: string;
    platform: string;
    location_label: string;
    created_at: string;
    last_used_at: string;
    expires_at: string;
  } | undefined;
}

export function touchTrustedDevice(id: string) {
  db.prepare('UPDATE trusted_devices SET last_used_at = ? WHERE id = ?').run(toTimestamp(), id);
}

export function revokeTrustedDevice(id: string, userId: string) {
  db.prepare('DELETE FROM trusted_devices WHERE id = ? AND user_id = ?').run(id, userId);
  db.prepare('DELETE FROM sessions WHERE trusted_device_id = ? AND user_id = ?').run(id, userId);
}

export function createSecurityEvent(userId: string, type: string, title: string, metadata: {
  deviceLabel: string;
  locationLabel: string;
  isAlert?: boolean;
  metadataJson?: string | null;
}) {
  db.prepare(`
    INSERT INTO security_events (user_id, type, title, device_label, location_label, created_at, is_alert, metadata_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    type,
    title,
    metadata.deviceLabel,
    metadata.locationLabel,
    toTimestamp(),
    metadata.isAlert ? 1 : 0,
    metadata.metadataJson ?? null,
  );
}

export function createWebAuthnChallenge(userId: string, challenge: string, type: 'registration' | 'authentication') {
  const id = crypto.randomUUID();
  const createdAt = toTimestamp();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 10).toISOString();
  db.prepare('INSERT INTO webauthn_challenges (id, user_id, challenge, type, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, userId, challenge, type, expiresAt, createdAt);
  return { id, expiresAt };
}

export function consumeWebAuthnChallenge(id: string, type: 'registration' | 'authentication') {
  const record = db.prepare('SELECT user_id, challenge, expires_at FROM webauthn_challenges WHERE id = ? AND type = ?').get(id, type) as {
    user_id: string;
    challenge: string;
    expires_at: string;
  } | undefined;
  if (!record || new Date(record.expires_at).getTime() <= Date.now()) {
    db.prepare('DELETE FROM webauthn_challenges WHERE id = ?').run(id);
    return null;
  }
  db.prepare('DELETE FROM webauthn_challenges WHERE id = ?').run(id);
  return record;
}

export function consumeLoginChallenge(token: string) {
  const record = db.prepare('SELECT user_id, expires_at FROM login_challenges WHERE token = ?').get(token) as { user_id: string; expires_at: string } | undefined;
  if (!record || new Date(record.expires_at).getTime() <= Date.now()) {
    db.prepare('DELETE FROM login_challenges WHERE token = ?').run(token);
    return null;
  }
  db.prepare('DELETE FROM login_challenges WHERE token = ?').run(token);
  return record.user_id;
}

export function getDbTimestamp() {
  return toTimestamp();
}

export function getDatabasePath() {
  return dbPath;
}

export type IngestedPreprintRecord = {
  id: string;
  canonical_paper_id?: string | null;
  source_name: string;
  external_id: string;
  title: string;
  authors_json: string;
  summary: string;
  published_at: string;
  updated_at: string;
  categories_json: string;
  doi: string | null;
  abs_url: string | null;
  pdf_url: string | null;
  raw_json: string | null;
  sync_run_id: string | null;
  created_at: string;
  imported_at: string;
};

export function createContentSyncRun(sourceName: string, queryText: string) {
  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO content_sync_runs (id, source_name, query_text, status, item_count, started_at)
    VALUES (?, ?, ?, 'running', 0, ?)
  `).run(id, sourceName, queryText, toTimestamp());
  return { id };
}

export function completeContentSyncRun(id: string, status: 'succeeded' | 'failed', itemCount: number, errorMessage?: string) {
  db.prepare(`
    UPDATE content_sync_runs
    SET status = ?, item_count = ?, error_message = ?, completed_at = ?
    WHERE id = ?
  `).run(status, itemCount, errorMessage ?? null, toTimestamp(), id);
}

export function upsertIngestedPreprints(preprints: Array<{
  sourceName: string;
  externalId: string;
  title: string;
  authors: string[];
  summary: string;
  publishedAt: string;
  updatedAt: string;
  categories: string[];
  doi?: string | null;
  absUrl?: string | null;
  pdfUrl?: string | null;
  rawJson?: string | null;
  syncRunId?: string | null;
}>) {
  const statement = db.prepare(`
    INSERT INTO ingested_preprints (
      id, source_name, external_id, title, authors_json, summary, published_at, updated_at,
      categories_json, doi, abs_url, pdf_url, raw_json, sync_run_id, created_at, imported_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(source_name, external_id) DO UPDATE SET
      title = excluded.title,
      authors_json = excluded.authors_json,
      summary = excluded.summary,
      published_at = excluded.published_at,
      updated_at = excluded.updated_at,
      categories_json = excluded.categories_json,
      doi = excluded.doi,
      abs_url = excluded.abs_url,
      pdf_url = excluded.pdf_url,
      raw_json = excluded.raw_json,
      sync_run_id = excluded.sync_run_id,
      imported_at = excluded.imported_at
  `);

  const now = toTimestamp();
  const tx = db.transaction(() => {
    preprints.forEach((preprint) => {
      const existing = db.prepare('SELECT id, created_at FROM ingested_preprints WHERE source_name = ? AND external_id = ?')
        .get(preprint.sourceName, preprint.externalId) as { id: string; created_at: string } | undefined;
      statement.run(
        existing?.id ?? crypto.randomUUID(),
        preprint.sourceName,
        preprint.externalId,
        preprint.title,
        JSON.stringify(preprint.authors),
        preprint.summary,
        preprint.publishedAt,
        preprint.updatedAt,
        JSON.stringify(preprint.categories),
        preprint.doi ?? null,
        preprint.absUrl ?? null,
        preprint.pdfUrl ?? null,
        preprint.rawJson ?? null,
        preprint.syncRunId ?? null,
        existing?.created_at ?? now,
        now,
      );
    });
  });
  tx();
}

export function listIngestedPreprints(limit = 250) {
  return db.prepare(`
    SELECT id, source_name, external_id, title, authors_json, summary, published_at, updated_at,
           categories_json, doi, abs_url, pdf_url, raw_json, sync_run_id, created_at, imported_at
    FROM ingested_preprints
    ORDER BY published_at DESC, imported_at DESC
    LIMIT ?
  `).all(limit) as IngestedPreprintRecord[];
}

export const PREPRINTS = MOCK_PREPRINTS;
