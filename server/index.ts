import cookieParser from 'cookie-parser';
import express from 'express';
import type { Server } from 'node:http';
import type { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';
import * as otplib from 'otplib';
import { generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse } from '@simplewebauthn/server';
import type { AuthenticationResponseJSON, RegistrationResponseJSON, WebAuthnCredential } from '@simplewebauthn/server';
import { initDb, getDbTimestamp, hashUserPassword, type IngestedPreprintRecord, PREPRINTS, getDatabasePath, verifyUserPassword } from './db';
import { authStore } from './authStore';
import type { Preprint } from '../src/types';
import { contentStore, type ContentSyncDefinitionRecord } from './contentStore';
import { coreStore, type StoredCollection, type StoredCollectionCollaborator, type StoredModerationAction, type StoredModerationReport, type StoredNotification, type StoredPopularSearch, type StoredProductAnnouncement, type StoredSavedSearch, type StoredUser, type StoredSettings } from './coreStore';
import { securityStore, type StoredPasskey, type StoredSecurityEvent, type StoredSession, type StoredTrustedDevice, type StoredTwoFactor } from './securityStore';
import { assignModerationReportSchema, blockUserSchema, bulkModerationSchema, contentIngestSchema, contentSyncDefinitionSchema, createCollectionSchema, digestSendSchema, escalateModerationReportSchema, changePasswordSchema, chatMessageSchema, completeTwoFactorLoginSchema, createChatSchema, loginSchema, parseOrThrow, passwordResetRequestSchema, passwordResetSchema, productAnnouncementSchema, profilePublicationImportSchema, pushSubscriptionSchema, registerSchema, reportSchema, reviewModerationReportSchema, settingsSchema, shareSchema, updateCollectionAccessSchema, updateCollectionPapersSchema, updateCollectionSchema, updateProfileSchema } from './validation';
import { sendNotificationEmail, sendPasswordResetEmail, sendVerificationEmail } from './emailService';
import { emitMonitoringEvent } from './monitoring';
import { contentSources, getContentSource } from './sources';
import { fetchProfilePublicationsFromSource } from './profilePublicationImport';
import { runDueDigests, sendDigestNow } from './digestService';
import { getPushPublicKey, sendPushNotification } from './pushService';

initDb();
await coreStore.init();
await authStore.init();
await securityStore.init();
await contentStore.init();
await coreStore.setUserAdminByEmail(process.env.INITIAL_ADMIN_EMAIL ?? 'aris.thorne@uzh.ch', true);

const app = express();
const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3001);
const migrateOnly = process.argv.includes('--migrate-only');
const sessionCookieName = 'preprint_explorer_session';
const trustedDeviceCookieName = 'preprint_explorer_trusted_device';
const isProduction = process.env.NODE_ENV === 'production';
const webAuthnRpID = process.env.WEBAUTHN_RP_ID ?? 'localhost';
const webAuthnOrigin = process.env.WEBAUTHN_ORIGIN ?? 'http://localhost:3000';
const initialAdminEmail = process.env.INITIAL_ADMIN_EMAIL ?? 'aris.thorne@uzh.ch';
let httpServer: Server | null = null;
let contentSyncInterval: NodeJS.Timeout | null = null;
let digestInterval: NodeJS.Timeout | null = null;
let isShuttingDown = false;

function wrapRouteHandler<T extends (...args: any[]) => any>(handler: T): T {
  return (function wrappedHandler(this: unknown, ...args: Parameters<T>) {
    const next = args[2] as NextFunction | undefined;
    try {
      const result = handler.apply(this, args);
      if (result && typeof (result as Promise<unknown>).then === 'function') {
        void Promise.resolve(result).catch((error) => next?.(error));
      }
      return result;
    } catch (error) {
      next?.(error);
      return undefined;
    }
  }) as T;
}

type RoutedMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';
for (const method of ['get', 'post', 'put', 'patch', 'delete'] as RoutedMethod[]) {
  const original = app[method].bind(app);
  (app[method] as typeof original) = ((...args: Parameters<typeof original>) => {
    const wrappedArgs = args.map((arg) => (
      typeof arg === 'function' ? wrapRouteHandler(arg as (...args: any[]) => any) : arg
    )) as Parameters<typeof original>;
    return original(...wrappedArgs);
  }) as typeof original;
}

async function shutdown(signal: string, error?: unknown) {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  if (contentSyncInterval) {
    clearInterval(contentSyncInterval);
    contentSyncInterval = null;
  }
  if (digestInterval) {
    clearInterval(digestInterval);
    digestInterval = null;
  }
  const errorMessage = error instanceof Error ? error.message : error ? String(error) : undefined;
  console.warn(JSON.stringify({
    type: 'shutdown',
    signal,
    error: errorMessage,
  }));
  if (httpServer) {
    await new Promise<void>((resolve) => httpServer?.close(() => resolve()));
  }
  await Promise.allSettled([
    coreStore.close(),
    authStore.close(),
    securityStore.close(),
    contentStore.close(),
  ]);
  process.exit(error ? 1 : 0);
}

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
process.on('uncaughtException', (error) => {
  void shutdown('uncaughtException', error);
});
process.on('unhandledRejection', (reason) => {
  void shutdown('unhandledRejection', reason);
});

app.use(express.json());
app.use(cookieParser());
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  } : false,
  crossOriginEmbedderPolicy: false,
}));
app.use((req, res, next) => {
  const requestId = crypto.randomUUID();
  (req as AuthenticatedRequest).requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  const startedAt = Date.now();
  res.on('finish', () => {
    console.info(JSON.stringify({
      type: 'http_request',
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
    }));
  });
  next();
});
app.use(async (_, __, next) => {
  try {
    await authStore.cleanupExpiredSessions();
    await authStore.cleanupExpiredActionTokens();
    next();
  } catch (error) {
    next(error);
  }
});

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again later.' },
});

const moderationRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many moderation actions. Please try again later.' },
});

const RECENT_AUTH_WINDOW_MS = 1000 * 60 * 10;

const liveConnections = new Map<string, Set<Response>>();
const activeContentSyncDefinitions = new Set<string>();

type LiveEvent =
  | { type: 'social-updated' }
  | { type: 'chat-updated'; chatId: string }
  | { type: 'security-updated' }
  | { type: 'notifications-updated' }
  | { type: 'content-updated'; sourceLabel: string; total: number };

type AuthenticatedRequest = Request & { userId?: string; sessionToken?: string; csrfToken?: string; trustedDeviceId?: string | null; recentAuthAt?: string; requestId?: string };

type UserRow = StoredUser;
type SettingsRow = StoredSettings;

type TwoFactorRow = StoredTwoFactor;
type SessionRow = StoredSession;
type TrustedDeviceRow = StoredTrustedDevice;
type SecurityEventRow = StoredSecurityEvent;
type PasskeyRow = StoredPasskey;
type NotificationRow = StoredNotification;

function hashBackupCode(code: string) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

function generateBackupCodes() {
  return Array.from({ length: 6 }, () =>
    `${crypto.randomBytes(2).toString('hex')}-${crypto.randomBytes(2).toString('hex')}`.toUpperCase(),
  );
}

function inferClientIp(req: Request) {
  const forwarded = req.header('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || req.socket.remoteAddress || '127.0.0.1';
}

function formatLocation(ip: string) {
  if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('::ffff:127.') || ip === '::ffff:127.0.0.1') {
    return `Local development (${os.hostname()})`;
  }
  return `IP ${ip}`;
}

function detectPlatform(userAgent: string) {
  const value = userAgent.toLowerCase();
  if (value.includes('iphone')) return 'iPhone';
  if (value.includes('ipad')) return 'iPad';
  if (value.includes('android')) return 'Android';
  if (value.includes('mac os x') || value.includes('macintosh')) return 'macOS';
  if (value.includes('windows')) return 'Windows';
  if (value.includes('linux')) return 'Linux';
  return 'Unknown platform';
}

function detectBrowser(userAgent: string) {
  const value = userAgent.toLowerCase();
  if (value.includes('edg/')) return 'Edge';
  if (value.includes('opr/') || value.includes('opera')) return 'Opera';
  if (value.includes('chrome/')) return 'Chrome';
  if (value.includes('firefox/')) return 'Firefox';
  if (value.includes('safari/') && !value.includes('chrome/')) return 'Safari';
  return 'Browser';
}

function inferDeviceType(platform: string): 'Desktop' | 'Mobile' | 'Tablet' {
  const value = platform.toLowerCase();
  if (value.includes('ipad')) return 'Tablet';
  if (value.includes('iphone') || value.includes('android')) return 'Mobile';
  return 'Desktop';
}

function getClientContext(req: Request) {
  const userAgent = req.header('user-agent') ?? '';
  const platform = detectPlatform(userAgent);
  const browser = detectBrowser(userAgent);
  const deviceLabel = `${browser} on ${platform}`;
  return {
    userAgent,
    browser,
    platform,
    deviceLabel,
    locationLabel: formatLocation(inferClientIp(req)),
  };
}

function formatEventTime(value: string) {
  return new Date(value).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function sendLiveEvent(userId: string, event: LiveEvent) {
  const connections = liveConnections.get(userId);
  if (!connections || connections.size === 0) {
    return;
  }
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  connections.forEach((response) => response.write(payload));
}

function broadcastLiveEvent(userIds: string[], event: LiveEvent) {
  [...new Set(userIds)].forEach((userId) => sendLiveEvent(userId, event));
}

function hasRecentAuth(req: AuthenticatedRequest) {
  if (!req.recentAuthAt) {
    return false;
  }
  return Date.now() - new Date(req.recentAuthAt).getTime() <= RECENT_AUTH_WINDOW_MS;
}

function parseTransports(value: string | null) {
  return value ? JSON.parse(value) as string[] : [];
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

async function getPasskeys(userId: string) {
  return await securityStore.listPasskeysByUserId(userId) as PasskeyRow[];
}

function buildPasskey(row: PasskeyRow) {
  return {
    id: row.id,
    label: row.label,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    deviceType: row.device_type,
    backedUp: Boolean(row.backed_up),
    transports: parseTransports(row.transports_json),
  };
}

function getWebAuthnCredential(row: PasskeyRow): WebAuthnCredential {
  return {
    id: row.id,
    publicKey: new Uint8Array(Buffer.from(row.public_key_b64, 'base64url')),
    counter: row.counter,
    transports: parseTransports(row.transports_json) as WebAuthnCredential['transports'],
  };
}

async function verifyPasskeyAssertion(userId: string, challengeText: string, response: AuthenticationResponseJSON) {
  const passkey = await securityStore.findPasskeyByIdAndUserId(response.id, userId) as PasskeyRow | undefined;

  if (!passkey) {
    return { passkey: null, verified: false as const, backedUp: false };
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challengeText,
    expectedOrigin: webAuthnOrigin,
    expectedRPID: webAuthnRpID,
    credential: getWebAuthnCredential(passkey),
  });

  if (!verification.verified) {
    return { passkey, verified: false as const, backedUp: false };
  }

  const backedUp = verification.authenticationInfo.credentialBackedUp ? 1 : 0;
  await securityStore.updatePasskeyUsage(passkey.id, verification.authenticationInfo.newCounter, Boolean(backedUp));

  return { passkey, verified: true as const, backedUp: Boolean(backedUp) };
}

async function getSecuritySummary(userId: string) {
  const twoFactor = await getTwoFactorRow(userId);
  const backupCodes = twoFactor.backup_codes_json ? JSON.parse(twoFactor.backup_codes_json) as string[] : [];
  const trustedDeviceCount = await securityStore.countTrustedDevices(userId);
  const passkeyCount = await securityStore.countPasskeys(userId);
  const user = await securityStore.getUserEmailVerificationState(userId);
  return {
    hasPassword: true,
    hasTwoFactorEnabled: Boolean(twoFactor.enabled && twoFactor.secret),
    backupCodesRemaining: backupCodes.length,
    passkeyCount: Number(passkeyCount),
    trustedDeviceCount: Number(trustedDeviceCount),
    isEmailVerified: Boolean(user?.is_email_verified),
  };
}

async function buildContentDatasetPayload(limit = 250) {
  const ingested = await contentStore.listPreprints(limit);
  if (ingested.length === 0) {
    return {
      sourceLabel: 'Bundled seed dataset',
      preprints: PREPRINTS,
    };
  }

  return {
    sourceLabel: `Live backend catalog (${ingested.length} papers)`,
    preprints: ingested.map(mapIngestedRecordToPreprint),
  };
}

function mapIngestedRecordToPreprint(record: IngestedPreprintRecord): Preprint {
  return {
    id: record.id,
    title: record.title,
    authors: JSON.parse(record.authors_json) as string[],
    source: record.source_name,
    publishedAt: record.published_at,
    date: record.published_at,
    tags: JSON.parse(record.categories_json) as string[],
    abstract: record.summary,
    doi: record.doi ?? undefined,
    url: record.abs_url ?? undefined,
    pdfUrl: record.pdf_url ?? undefined,
    type: 'Preprint',
  };
}

function normalizeSearchQuery(query: string) {
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizePersonLabel(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
}

function namesMatch(authorName: string, userName: string) {
  const normalizedAuthor = normalizePersonLabel(authorName);
  const normalizedUser = normalizePersonLabel(userName);
  if (!normalizedAuthor || !normalizedUser) {
    return false;
  }
  return normalizedAuthor === normalizedUser
    || normalizedAuthor.includes(normalizedUser)
    || normalizedUser.includes(normalizedAuthor);
}

function tokenizeSearchQuery(query: string) {
  return normalizeSearchQuery(query).split(/\s+/).filter(Boolean);
}

function countOccurrences(haystack: string, needle: string) {
  if (!needle) {
    return 0;
  }
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

function scoreSearchResult(preprint: Preprint, query: string) {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) {
    return 0;
  }
  const terms = tokenizeSearchQuery(query);
  const title = preprint.title.toLowerCase();
  const authors = preprint.authors.join(' ').toLowerCase();
  const tags = preprint.tags.join(' ').toLowerCase();
  const abstract = preprint.abstract.toLowerCase();
  const doi = preprint.doi?.toLowerCase() ?? '';
  const titleStart = title.startsWith(normalized);
  const abstractStart = abstract.startsWith(normalized);

  let score = 0;
  if (title === normalized) score += 220;
  if (doi === normalized) score += 180;
  if (titleStart) score += 110;
  if (title.includes(normalized)) score += 90 + (countOccurrences(title, normalized) * 10);
  if (authors.includes(normalized)) score += 65 + (countOccurrences(authors, normalized) * 6);
  if (tags.includes(normalized)) score += 55 + (countOccurrences(tags, normalized) * 5);
  if (doi.includes(normalized)) score += 85;
  if (abstractStart) score += 24;
  if (abstract.includes(normalized)) score += 18 + Math.min(18, countOccurrences(abstract, normalized) * 2);

  terms.forEach((term) => {
    if (title.includes(term)) score += 30 + Math.min(18, countOccurrences(title, term) * 4);
    if (authors.includes(term)) score += 17 + Math.min(12, countOccurrences(authors, term) * 3);
    if (tags.includes(term)) score += 16 + Math.min(10, countOccurrences(tags, term) * 3);
    if (doi.includes(term)) score += 24;
    if (abstract.includes(term)) score += 8 + Math.min(12, countOccurrences(abstract, term) * 2);
    if (title.startsWith(term)) score += 8;
    if (tags.split(/\s+/).some((tag) => tag.startsWith(term))) score += 6;
  });

  const distinctTermMatches = terms.filter((term) => (
    title.includes(term) || authors.includes(term) || tags.includes(term) || abstract.includes(term) || doi.includes(term)
  )).length;
  score += distinctTermMatches * 10;

  const engagementBoost = ((preprint.citations ?? 0) * 0.08)
    + ((preprint.savesCount ?? 0) * 0.4)
    + ((preprint.views ?? 0) * 0.01)
    + ((preprint.rating ?? 0) * 3);
  score += Math.min(35, engagementBoost);

  const publishedAt = new Date(preprint.publishedAt ?? preprint.date).getTime();
  if (!Number.isNaN(publishedAt)) {
    const daysOld = Math.max(0, (Date.now() - publishedAt) / (1000 * 60 * 60 * 24));
    score += Math.max(0, 22 - Math.min(22, daysOld / 12));
  }

  return score;
}

function buildSearchSnippet(preprint: Preprint, query: string) {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) {
    return undefined;
  }
  const abstract = preprint.abstract ?? '';
  const abstractLower = abstract.toLowerCase();
  const terms = [normalized, ...tokenizeSearchQuery(query)].filter(Boolean);
  const matchIndex = terms.reduce((best, term) => {
    const index = abstractLower.indexOf(term);
    if (index === -1) {
      return best;
    }
    if (best === -1 || index < best) {
      return index;
    }
    return best;
  }, -1);
  if (matchIndex < 0) {
    return undefined;
  }
  const start = Math.max(0, matchIndex - 60);
  const end = Math.min(abstract.length, matchIndex + Math.max(normalized.length, 24) + 80);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < abstract.length ? '…' : '';
  return `${prefix}${abstract.slice(start, end).trim()}${suffix}`;
}

function matchesPreprintKeyword(preprint: Preprint, keyword: string) {
  return scoreSearchResult(preprint, keyword) > 0;
}

function getMatchedFields(preprint: Preprint, query: string) {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) {
    return [];
  }
  const terms = [normalized, ...tokenizeSearchQuery(query)];
  const fields: string[] = [];
  if (terms.some((term) => preprint.title.toLowerCase().includes(term))) fields.push('title');
  if (terms.some((term) => preprint.authors.some((author) => author.toLowerCase().includes(term)))) fields.push('authors');
  if (terms.some((term) => preprint.tags.some((tag) => tag.toLowerCase().includes(term)))) fields.push('tags');
  if (terms.some((term) => (preprint.abstract ?? '').toLowerCase().includes(term))) fields.push('abstract');
  if (terms.some((term) => (preprint.doi ?? '').toLowerCase().includes(term))) fields.push('doi');
  return fields;
}

function buildSavedSearch(row: StoredSavedSearch) {
  return {
    id: row.id,
    label: row.label,
    queryText: row.query_text,
    filters: JSON.parse(row.filters_json) as {
      sources?: string[];
      categories?: string[];
      publicationType?: string;
      sortBy?: string;
      dateRange?: string;
      startDate?: string;
      endDate?: string;
    },
    updatedAt: row.updated_at,
  };
}

function buildPopularSearch(row: StoredPopularSearch) {
  return {
    query: row.display_query,
    count: Number(row.search_count),
    lastSearchedAt: row.last_searched_at,
    lastResultCount: Number(row.last_result_count),
  };
}

function buildSyncDefinition(row: ContentSyncDefinitionRecord) {
  return {
    id: row.id,
    sourceId: row.source_name,
    sourceLabel: getContentSource(row.source_name)?.label ?? row.source_name,
    query: row.query_text,
    maxResults: Number(row.max_results),
    intervalMinutes: Number(row.interval_minutes),
    enabled: Boolean(row.enabled),
    lastRunAt: row.last_run_at,
    nextRunAt: row.next_run_at,
    lastStatus: row.last_status,
    lastError: row.last_error,
    updatedAt: row.updated_at,
  };
}

function computeNextSyncAt(from: string, intervalMinutes: number) {
  return new Date(new Date(from).getTime() + intervalMinutes * 60 * 1000).toISOString();
}

async function executeSourceIngest(sourceId: string, query: string, maxResults: number, syncDefinition?: ContentSyncDefinitionRecord) {
  const source = getContentSource(sourceId);
  if (!source) {
    throw new Error(`Unknown content source: ${sourceId}`);
  }
  let syncRun: { id: string } | null = null;
  try {
    syncRun = await contentStore.createSyncRun(source.label, query);
    const mapped = (await source.fetch({ query, maxResults })).map((entry) => ({
      ...entry,
      syncRunId: syncRun!.id,
    }));
    await contentStore.upsertPreprints(mapped);
    await contentStore.completeSyncRun(syncRun.id, 'succeeded', mapped.length);
    if (syncDefinition) {
      const completedAt = getDbTimestamp();
      await contentStore.markSyncDefinitionRun({
        id: syncDefinition.id,
        lastRunAt: completedAt,
        nextRunAt: computeNextSyncAt(completedAt, Number(syncDefinition.interval_minutes)),
        lastStatus: 'succeeded',
        lastError: null,
      });
    }
    return {
      imported: mapped.length,
      dataset: await buildContentDatasetPayload(),
      sourceLabel: source.label,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : `Unable to ingest ${source.label} content`;
    if (syncRun) {
      await contentStore.completeSyncRun(syncRun.id, 'failed', 0, message);
    }
    if (syncDefinition) {
      const completedAt = getDbTimestamp();
      await contentStore.markSyncDefinitionRun({
        id: syncDefinition.id,
        lastRunAt: completedAt,
        nextRunAt: computeNextSyncAt(completedAt, Number(syncDefinition.interval_minutes)),
        lastStatus: 'failed',
        lastError: message,
      });
    }
    throw error;
  }
}

async function runDueContentSyncs() {
  const dueSyncs = await contentStore.listDueSyncDefinitions(getDbTimestamp());
  for (const syncDefinition of dueSyncs) {
    if (activeContentSyncDefinitions.has(syncDefinition.id)) {
      continue;
    }
    activeContentSyncDefinitions.add(syncDefinition.id);
    try {
      await executeSourceIngest(
        syncDefinition.source_name,
        syncDefinition.query_text,
        Number(syncDefinition.max_results),
        syncDefinition,
      );
    } catch (error) {
      console.warn(JSON.stringify({
        type: 'content_sync_failed',
        syncDefinitionId: syncDefinition.id,
        sourceName: syncDefinition.source_name,
        error: error instanceof Error ? error.message : String(error),
      }));
    } finally {
      activeContentSyncDefinitions.delete(syncDefinition.id);
    }
  }
}

async function wouldLeaveAccountWithoutRecovery(userId: string, changes?: {
  removeTwoFactor?: boolean;
  removePasskeyCount?: number;
}) {
  const summary = await getSecuritySummary(userId);
  const remainingPasskeys = Math.max(0, summary.passkeyCount - (changes?.removePasskeyCount ?? 0));
  const hasTwoFactorEnabled = changes?.removeTwoFactor ? false : summary.hasTwoFactorEnabled;
  return !summary.isEmailVerified && !hasTwoFactorEnabled && remainingPasskeys === 0;
}

function setTrustedDeviceCookie(res: Response, token: string, expiresAt: string) {
  res.cookie(trustedDeviceCookieName, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    expires: new Date(expiresAt),
    path: '/',
  });
}

function clearTrustedDeviceCookie(res: Response) {
  res.clearCookie(trustedDeviceCookieName, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  });
}

async function getTrustedDeviceFromCookie(req: Request, userId?: string) {
  const rawToken = req.cookies?.[trustedDeviceCookieName] as string | undefined;
  if (!rawToken) {
    return null;
  }
  const record = await authStore.findTrustedDeviceByToken(rawToken);
  if (!record) {
    return null;
  }
  if (new Date(record.expires_at).getTime() <= Date.now()) {
    await authStore.revokeTrustedDevice(record.id, record.user_id);
    return null;
  }
  if (userId && record.user_id !== userId) {
    return null;
  }
  await authStore.touchTrustedDevice(record.id);
  return record;
}

async function getTwoFactorRow(userId: string) {
  await securityStore.ensureTwoFactorRecord(userId);
  return await securityStore.findTwoFactorRow(userId) as TwoFactorRow;
}

async function hasTwoFactorEnabled(userId: string) {
  const row = await getTwoFactorRow(userId);
  return Boolean(row.enabled && row.secret);
}

async function consumeBackupCode(userId: string, code: string) {
  const row = await getTwoFactorRow(userId);
  const hashes = row.backup_codes_json ? JSON.parse(row.backup_codes_json) as string[] : [];
  const hashed = hashBackupCode(code.trim().toUpperCase());
  const nextHashes = hashes.filter(value => value !== hashed);
  if (nextHashes.length === hashes.length) {
    return false;
  }
  await securityStore.updateBackupCodes(userId, JSON.stringify(nextHashes));
  return true;
}

async function verifyTwoFactorCode(userId: string, code: string) {
  const normalized = code.replace(/\s+/g, '').trim();
  const row = await getTwoFactorRow(userId);
  if (row.secret && otplib.verifySync({ token: normalized, secret: row.secret })) {
    return true;
  }
  return consumeBackupCode(userId, normalized);
}

async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.[sessionCookieName] as string | undefined;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const session = await securityStore.findSessionByToken(token) as SessionRow | undefined;
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (new Date(session.expires_at).getTime() <= Date.now()) {
      await authStore.destroySession(token);
      return res.status(401).json({ error: 'Session expired' });
    }
    req.userId = session.user_id;
    req.sessionToken = token;
    req.csrfToken = session.csrf_token;
    req.trustedDeviceId = session.trusted_device_id;
    req.recentAuthAt = session.recent_auth_at;
    await authStore.touchSession(token);
    next();
  } catch (error) {
    next(error);
  }
}

async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = await coreStore.findUserById(req.userId);
    if (!user?.is_admin) {
      return res.status(403).json({ error: 'Administrator access required' });
    }
    next();
  } catch (error) {
    next(error);
  }
}

function requireCsrf(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }
  const csrfHeader = req.header('x-csrf-token');
  if (!csrfHeader || csrfHeader !== req.csrfToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  next();
}

function setSessionCookie(res: Response, token: string) {
  res.cookie(sessionCookieName, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    expires: authStore.getSessionExpiry(),
    path: '/',
  });
}

function clearSessionCookie(res: Response) {
  res.clearCookie(sessionCookieName, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
  });
}

async function authResponse(userId: string, csrfToken: string) {
  const user = await coreStore.findUserById(userId) as UserRow;
  return {
    user: await buildUser(user, userId),
    settings: await getSettings(userId),
    social: await getSocialBootstrap(userId),
    csrfToken,
  };
}

async function listTrustedDevices(userId: string, currentSessionToken?: string, currentTrustedDeviceId?: string | null) {
  const sessions = await securityStore.listSessionsByUserId(userId) as SessionRow[];
  const remembered = await securityStore.listTrustedDevicesByUserId(userId) as TrustedDeviceRow[];

  return [
    ...sessions.map(session => ({
      id: `session:${session.token}`,
      name: session.device_label || 'Browser session',
      type: inferDeviceType(detectPlatform(session.user_agent)),
      location: session.location_label || 'Unknown location',
      lastActive: session.last_seen_at || session.created_at,
      isCurrent: session.token === currentSessionToken,
      accessType: 'session' as const,
      browser: detectBrowser(session.user_agent),
      platform: detectPlatform(session.user_agent),
      trustedUntil: undefined,
    })),
    ...remembered.map(device => ({
      id: `trusted:${device.id}`,
      name: device.device_label,
      type: inferDeviceType(device.platform),
      location: device.location_label,
      lastActive: device.last_used_at,
      isCurrent: currentTrustedDeviceId === device.id,
      accessType: 'trusted' as const,
      browser: device.browser,
      platform: device.platform,
      trustedUntil: device.expires_at,
    })),
  ];
}

async function listSecurityEvents(userId: string, currentSessionToken?: string) {
  const rows = await securityStore.listSecurityEventsByUserId(userId) as SecurityEventRow[];
  const currentSession = currentSessionToken
    ? await securityStore.findSessionDeviceSummary(currentSessionToken) as { device_label: string; created_at: string } | undefined
    : undefined;

  return rows.map(row => ({
    id: String(row.id),
    type: (['login', 'password', '2fa', 'device', 'session'].includes(row.type) ? row.type : 'session') as 'login' | 'password' | '2fa' | 'device' | 'session',
    title: row.title,
    device: row.device_label,
    location: row.location_label,
    time: formatEventTime(row.created_at),
    current: Boolean(currentSession && currentSession.created_at === row.created_at && currentSession.device_label === row.device_label),
    alert: Boolean(row.is_alert),
  }));
}

async function buildUser(user: UserRow, viewerId?: string) {
  const followersMap = await coreStore.getFollowerCounts();
  const followingMap = await coreStore.getFollowingCounts();
  const catalog = await contentStore.listPreprints(1000);
  const matchedPreprints = catalog
    .map(mapIngestedRecordToPreprint)
    .filter(preprint => preprint.authors.some((author) => namesMatch(author, user.name)));
  const publicationIds = matchedPreprints.map(preprint => preprint.id);
  const publicationCount = publicationIds.length;
  const citationCount = matchedPreprints.reduce((sum, preprint) => sum + (preprint.citations ?? 0), 0);
  const isFollowing = viewerId
    ? await coreStore.isFollowing(viewerId, user.id)
    : false;
  const followerCount = followersMap.get(user.id) ?? 0;
  const followingCount = followingMap.get(user.id) ?? 0;
  const hIndex = Math.max(1, Math.round(citationCount / 100 || 1));
  const i10Index = Math.max(1, Math.round(citationCount / 200 || 1));

  return {
    id: user.id,
    name: user.name,
    title: user.title,
    email: user.email,
    orcidId: user.orcid_id ?? undefined,
    isAdmin: Boolean(user.is_admin),
    affiliation: user.affiliation,
    institutionId: user.institution_id ?? undefined,
    imageUrl: user.image_url,
    bio: user.bio,
    publications: publicationIds,
    followers: followerCount,
    following: followingCount,
    isFollowing,
    isEmailVerified: Boolean(user.is_email_verified),
    isAffiliationVerified: Boolean(user.is_affiliation_verified),
    hasTwoFactorEnabled: await hasTwoFactorEnabled(user.id),
    stats: {
      preprints: publicationCount,
      citations: citationCount,
      followers: followerCount,
      hIndex,
      i10Index,
      totalPublications: publicationCount,
    },
  };
}

async function getSettings(userId: string) {
  await coreStore.ensureDefaultSettings(userId);
  const settings = await coreStore.findSettingsByUserId(userId) as SettingsRow | undefined;
  return {
    pushEnabled: Boolean(settings?.push_enabled ?? 1),
    emailEnabled: Boolean(settings?.email_enabled ?? 1),
    dailyDigest: Boolean(settings?.daily_digest ?? 1),
    weeklyDigest: Boolean(settings?.weekly_digest ?? 1),
    newPublications: Boolean(settings?.new_publications ?? 1),
    citationAlerts: Boolean(settings?.citation_alerts ?? 1),
    productUpdates: Boolean(settings?.product_updates ?? 0),
    deliveryDay: settings?.delivery_day ?? 'Friday',
    profileVisibility: settings?.profile_visibility ?? 'public',
    messagePrivacy: settings?.message_privacy ?? 'everyone',
    sharePrivacy: settings?.share_privacy ?? 'everyone',
  };
}

async function canViewProfile(viewerId: string, targetUserId: string) {
  if (viewerId === targetUserId) {
    return true;
  }
  if (await coreStore.isBlockedBetween(viewerId, targetUserId)) {
    return false;
  }
  const settings = await getSettings(targetUserId);
  if (settings.profileVisibility === 'public') {
    return true;
  }
  if (settings.profileVisibility === 'private') {
    return false;
  }
  return coreStore.isFollowing(viewerId, targetUserId);
}

async function assertPrivacyAccess(viewerId: string, targetUserId: string, field: 'messagePrivacy' | 'sharePrivacy') {
  if (await coreStore.isBlockedBetween(viewerId, targetUserId)) {
    return false;
  }
  if (viewerId === targetUserId) {
    return true;
  }
  const settings = await getSettings(targetUserId);
  const value = settings[field];
  if (value === 'everyone') {
    return true;
  }
  if (value === 'nobody') {
    return false;
  }
  return coreStore.isFollowing(viewerId, targetUserId);
}

async function assertNotBlocked(userA: string, userB: string) {
  return !(await coreStore.isBlockedBetween(userA, userB));
}

function buildNotification(row: NotificationRow) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description,
    time: formatEventTime(row.created_at),
    isNew: !row.read_at,
    actionUrl: row.action_url ?? undefined,
  };
}

function buildProductAnnouncement(row: StoredProductAnnouncement) {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    actionUrl: row.action_url ?? undefined,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
  };
}

async function buildCollectionsForUser(userId: string) {
  const user = await coreStore.findUserById(userId);
  const collections = await coreStore.listCollectionsForUser(userId, user?.email ?? null) as StoredCollection[];
  const collectionIds = collections.map((collection) => collection.id);
  const collaborators = await coreStore.listCollectionCollaborators(collectionIds) as StoredCollectionCollaborator[];
  const preprintLinks = await coreStore.listCollectionPreprintIds(collectionIds);
  const preprintMap = new Map(PREPRINTS.map((preprint) => [preprint.id, preprint]));

  return collections.map((collection) => {
    const preprintIds = preprintLinks
      .filter((entry) => entry.collection_id === collection.id)
      .map((entry) => entry.preprint_id);
    const collectionCollaborators = collaborators
      .filter((entry) => entry.collection_id === collection.id)
      .map((entry) => ({
        email: entry.email,
        role: entry.role,
      }));
    const totalCitations = preprintIds.reduce((sum, preprintId) => sum + (preprintMap.get(preprintId)?.citations ?? 0), 0);

    return {
      id: collection.id,
      ownerId: collection.owner_user_id,
      name: collection.name,
      description: collection.description ?? '',
      preprintIds,
      collaborators: collectionCollaborators,
      sharedWith: collectionCollaborators.map((entry) => entry.email),
      shareLinkToken: collection.share_link_token,
      paperCount: preprintIds.length,
      totalCitations,
      updatedAt: collection.updated_at,
      imageUrl: collection.image_url,
    };
  });
}

async function getCollectionAccessForUser(userId: string, collectionId: string) {
  const collection = await coreStore.findCollectionById(collectionId);
  if (!collection) {
    return { collection: undefined, role: 'none' as const };
  }
  if (collection.owner_user_id === userId) {
    return { collection, role: 'owner' as const };
  }
  const user = await coreStore.findUserById(userId);
  if (!user?.email) {
    return { collection, role: 'none' as const };
  }
  const collaborators = await coreStore.listCollectionCollaborators([collectionId]);
  const collaborator = collaborators.find((entry) => entry.email.toLowerCase() === user.email.toLowerCase());
  if (!collaborator) {
    return { collection, role: 'none' as const };
  }
  return { collection, role: collaborator.role };
}

function getAbsoluteActionUrl(actionUrl?: string | null) {
  if (!actionUrl) {
    return null;
  }
  const baseUrl = (process.env.APP_URL ?? process.env.WEBAUTHN_ORIGIN ?? 'http://localhost:3000').replace(/\/$/, '');
  return `${baseUrl}${actionUrl.startsWith('/') ? actionUrl : `/${actionUrl}`}`;
}

function shouldDeliverEmailNotification(type: NotificationRow['type'], settings: Awaited<ReturnType<typeof getSettings>>) {
  if (!settings.emailEnabled) {
    return false;
  }
  if (type === 'feed') {
    return settings.newPublications;
  }
  if (type === 'citation') {
    return settings.citationAlerts;
  }
  if (type === 'product') {
    return settings.productUpdates;
  }
  return true;
}

function shouldDeliverPushNotification(type: NotificationRow['type'], settings: Awaited<ReturnType<typeof getSettings>>) {
  if (!settings.pushEnabled) {
    return false;
  }
  if (type === 'feed') {
    return settings.newPublications;
  }
  if (type === 'citation') {
    return settings.citationAlerts;
  }
  if (type === 'product') {
    return settings.productUpdates;
  }
  return true;
}

async function notifyUser(input: {
  userId: string;
  type: NotificationRow['type'];
  title: string;
  description: string;
  createdAt?: string;
  actorUserId?: string | null;
  actionUrl?: string | null;
  emailOverride?: boolean;
  pushOverride?: boolean;
}) {
  const createdAt = input.createdAt ?? getDbTimestamp();
  await coreStore.createNotification({
    userId: input.userId,
    type: input.type,
    title: input.title,
    description: input.description,
    createdAt,
    actorUserId: input.actorUserId ?? null,
    actionUrl: input.actionUrl ?? null,
  });

  const settings = await getSettings(input.userId);
  const user = await coreStore.findUserById(input.userId);
  if (user?.email && input.emailOverride !== false && shouldDeliverEmailNotification(input.type, settings)) {
    try {
      await sendNotificationEmail({
        to: user.email,
        subject: input.title,
        heading: input.title,
        message: input.description,
        actionLabel: 'Open in Preprint Explorer',
        actionUrl: getAbsoluteActionUrl(input.actionUrl ?? null),
      });
    } catch (error) {
      console.warn(JSON.stringify({
        type: 'notification_email_failed',
        userId: input.userId,
        notificationType: input.type,
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  if (input.pushOverride !== false && shouldDeliverPushNotification(input.type, settings)) {
    try {
      const subscriptions = await coreStore.listPushSubscriptionsByUserIds([input.userId]);
      await sendPushNotification(subscriptions, {
        title: input.title,
        body: input.description,
        actionUrl: input.actionUrl ?? null,
      });
    } catch (error) {
      console.warn(JSON.stringify({
        type: 'notification_push_failed',
        userId: input.userId,
        notificationType: input.type,
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }

  sendLiveEvent(input.userId, { type: 'notifications-updated' });
}

function getModerationPolicy() {
  const severeReasons = (process.env.MODERATION_AUTO_ESCALATE_REASONS ?? 'harassment,misinformation,copyright')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const repeatThreshold = Math.max(1, Number(process.env.MODERATION_TARGET_REPORT_ESCALATION_THRESHOLD ?? '3'));
  const autoAssign = (process.env.MODERATION_AUTO_ASSIGN ?? '1') === '1';
  return {
    autoAssign,
    severeReasons,
    repeatThreshold,
  };
}

function pickModerator(reportId: string, moderators: UserRow[]) {
  if (moderators.length === 0) {
    return undefined;
  }
  const hash = Array.from(reportId).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return moderators[hash % moderators.length];
}

async function applyModerationPolicy(report: StoredModerationReport) {
  const policy = getModerationPolicy();
  const moderators = (await coreStore.listUsers()).filter((user) => Boolean(user.is_admin));
  let updatedReport = report;

  if (policy.autoAssign && !updatedReport.assigned_to_user_id) {
    const moderator = pickModerator(updatedReport.id, moderators);
    if (moderator) {
      const assigned = await coreStore.assignModerationReport(updatedReport.id, moderator.id, getDbTimestamp(), moderator.id);
      if (assigned) {
        updatedReport = assigned;
        await notifyUser({
          userId: moderator.id,
          type: 'moderation',
          title: 'Moderation report assigned',
          description: `A ${updatedReport.reason} report was assigned to you.`,
          createdAt: getDbTimestamp(),
          actionUrl: `/moderation/${updatedReport.id}`,
          emailOverride: true,
          pushOverride: true,
        });
      }
    }
  }

  const similarReports = await coreStore.listModerationReports(['open', 'reviewing']);
  const repeatedTargetCount = similarReports.filter((item) => item.target_type === updatedReport.target_type && item.target_id === updatedReport.target_id).length;
  const shouldEscalate = !updatedReport.escalated_at && (
    policy.severeReasons.includes(updatedReport.reason)
    || repeatedTargetCount >= policy.repeatThreshold
  );

  if (shouldEscalate) {
    const escalationReason = policy.severeReasons.includes(updatedReport.reason)
      ? `Auto-escalated due to policy severity for ${updatedReport.reason}.`
      : `Auto-escalated after ${repeatedTargetCount} reports against the same target.`;
    const escalated = await coreStore.escalateModerationReport({
      reportId: updatedReport.id,
      escalationReason,
      escalatedAt: getDbTimestamp(),
      actorUserId: updatedReport.assigned_to_user_id ?? updatedReport.reporter_user_id,
    });
    if (escalated) {
      updatedReport = escalated;
      await emitMonitoringEvent({
        type: 'moderation_report_auto_escalated',
        severity: 'warning',
        timestamp: new Date().toISOString(),
        payload: {
          reportId: updatedReport.id,
          targetType: updatedReport.target_type,
          targetId: updatedReport.target_id,
          reason: updatedReport.reason,
          repeatedTargetCount,
          escalationReason,
        },
      });
    }
  }

  return updatedReport;
}

async function buildModerationReport(row: StoredModerationReport) {
  const [reporter, reviewer, assignee] = await Promise.all([
    coreStore.findUserById(row.reporter_user_id),
    row.reviewed_by_user_id ? coreStore.findUserById(row.reviewed_by_user_id) : Promise.resolve(undefined),
    row.assigned_to_user_id ? coreStore.findUserById(row.assigned_to_user_id) : Promise.resolve(undefined),
  ]);

  const evidence: Array<{ label: string; value: string }> = [
    { label: 'Target', value: `${row.target_type}:${row.target_id}` },
    { label: 'Reason', value: row.reason },
  ];
  if (row.details) {
    evidence.push({ label: 'Reporter details', value: row.details });
  }

  return {
    id: row.id,
    reporterUserId: row.reporter_user_id,
    reporterName: reporter?.name ?? row.reporter_user_id,
    targetType: row.target_type,
    targetId: row.target_id,
    reason: row.reason,
    details: row.details ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    assignedToUserId: row.assigned_to_user_id ?? undefined,
    assigneeName: assignee?.name ?? undefined,
    escalatedAt: row.escalated_at ?? undefined,
    escalationReason: row.escalation_reason ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
    reviewerName: reviewer?.name ?? undefined,
    resolutionNote: row.resolution_note ?? undefined,
    evidence,
  };
}

async function buildModerationAction(row: StoredModerationAction) {
  const actor = await coreStore.findUserById(row.actor_user_id);
  return {
    id: row.id,
    reportId: row.report_id,
    actorUserId: row.actor_user_id,
    actorName: actor?.name ?? row.actor_user_id,
    actionType: row.action_type,
    actionNote: row.action_note ?? undefined,
    createdAt: row.created_at,
  };
}

async function listNotifications(userId: string) {
  const rows = await coreStore.listNotificationsByUserId(userId);
  return rows.map(buildNotification);
}

async function buildChat(chatId: number, viewerId: string) {
  const participantRows = (await coreStore.listChatParticipantIds(chatId)).map((user_id) => ({ user_id }));
  const messages = await coreStore.listChatMessages(chatId);
  const lastMessage = messages[messages.length - 1];
  const actionUrl = `/chat/${chatId}`;
  const unreadCount = await coreStore.countUnreadNotificationsByActionUrl(viewerId, actionUrl);

  return {
    id: String(chatId),
    participants: participantRows.map(row => row.user_id),
    lastMessage: lastMessage?.text ?? '',
    lastMessageTime: lastMessage ? new Date(lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
    lastMessageAt: lastMessage?.created_at ?? undefined,
    unreadCount,
    messages: messages.map(message => ({
      id: String(message.id),
      senderId: message.sender_id,
      text: message.text,
      timestamp: new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: message.created_at,
    })),
  };
}

async function getSocialBootstrap(viewerId: string) {
  const visibleUsers = await Promise.all((await coreStore.listUsers()).map(async (user) => {
    if (user.id === viewerId || await canViewProfile(viewerId, user.id)) {
      return buildUser(user, viewerId);
    }
    return null;
  }));
  const chatRows = await coreStore.listUserChatIds(viewerId);

  return {
    users: visibleUsers.filter((user): user is Awaited<ReturnType<typeof buildUser>> => Boolean(user)),
    chats: await Promise.all(chatRows.map(chatId => buildChat(chatId, viewerId))),
  };
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    uptimeSeconds: Math.round(process.uptime()),
    environment: process.env.NODE_ENV ?? 'development',
    requestTimestamp: new Date().toISOString(),
    initialAdminEmail,
    databasePath: getDatabasePath(),
    contentStore: contentStore.kind,
    coreStore: coreStore.kind,
    authStore: authStore.kind,
    securityStore: securityStore.kind,
  });
});

app.get('/api/ready', async (_req, res) => {
  try {
    await Promise.all([
      coreStore.ping(),
      authStore.ping(),
      securityStore.ping(),
      contentStore.ping(),
    ]);
    res.json({
      ok: true,
      ready: true,
      timestamp: new Date().toISOString(),
      checks: {
        coreStore: 'ok',
        authStore: 'ok',
        securityStore: 'ok',
        contentStore: 'ok',
      },
    });
  } catch (error) {
    res.status(503).json({
      ok: false,
      ready: false,
      error: error instanceof Error ? error.message : 'Readiness failed',
    });
  }
});

app.get('/api/metrics', async (_req, res) => {
  const [users, reports, content] = await Promise.all([
    coreStore.listUsers(),
    coreStore.listModerationReports(),
    contentStore.listPreprints(1000),
  ]);
  const reportCounts = reports.reduce<Record<string, number>>((acc, report) => {
    acc[report.status] = (acc[report.status] ?? 0) + 1;
    return acc;
  }, {});
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    users: users.length,
    preprints: content.length,
    moderation: {
      totalReports: reports.length,
      openReports: reportCounts.open ?? 0,
      reviewingReports: reportCounts.reviewing ?? 0,
      resolvedReports: reportCounts.resolved ?? 0,
      dismissedReports: reportCounts.dismissed ?? 0,
    },
  });
});

app.get('/api/events', requireAuth, (req: AuthenticatedRequest, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const userId = req.userId!;
  const connections = liveConnections.get(userId) ?? new Set<Response>();
  connections.add(res);
  liveConnections.set(userId, connections);
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  req.on('close', () => {
    const current = liveConnections.get(userId);
    current?.delete(res);
    if (current && current.size === 0) {
      liveConnections.delete(userId);
    }
  });
});

app.get('/api/content/preprints', requireAuth, async (_req: AuthenticatedRequest, res) => {
  res.json(await buildContentDatasetPayload());
});

app.get('/api/content/search', requireAuth, async (req: AuthenticatedRequest, res) => {
  const query = typeof req.query.q === 'string' ? req.query.q : '';
  const normalizedQuery = normalizeSearchQuery(query);
  const sortBy = typeof req.query.sortBy === 'string' ? req.query.sortBy : 'Relevance';
  const publicationType = typeof req.query.publicationType === 'string' ? req.query.publicationType : undefined;
  const limit = Math.min(250, Math.max(1, Number(req.query.limit ?? 100)));
  const sources = typeof req.query.sources === 'string' && req.query.sources.trim()
    ? req.query.sources.split(',').map((value) => value.trim()).filter(Boolean)
    : [];
  const keywords = typeof req.query.keywords === 'string' && req.query.keywords.trim()
    ? req.query.keywords.split(',').map((value) => value.trim()).filter(Boolean)
    : [];
  const categories = typeof req.query.categories === 'string' && req.query.categories.trim()
    ? req.query.categories.split(',').map((value) => value.trim()).filter(Boolean)
    : [];
  const startDate = typeof req.query.startDate === 'string' && req.query.startDate.trim() ? req.query.startDate : undefined;
  const endDate = typeof req.query.endDate === 'string' && req.query.endDate.trim() ? req.query.endDate : undefined;

  const ingested = await contentStore.searchPreprints({
    query,
    sources,
    categories,
    publicationType,
    sortBy,
    startDate,
    endDate,
    limit: 1000,
  });

  const baseResults = (ingested.length > 0 ? ingested.map(mapIngestedRecordToPreprint) : PREPRINTS)
    .filter((preprint) => {
      if (sources.length > 0 && !sources.includes(preprint.source)) {
        return false;
      }
      if (categories.length > 0 && !preprint.tags.some((tag) => categories.includes(tag))) {
        return false;
      }
      if (publicationType && publicationType !== 'All Types' && preprint.type !== publicationType) {
        return false;
      }
      const publishedAt = new Date(preprint.publishedAt ?? preprint.date).getTime();
      if (startDate && !Number.isNaN(publishedAt) && publishedAt < new Date(startDate).getTime()) {
        return false;
      }
      if (endDate && !Number.isNaN(publishedAt) && publishedAt > new Date(endDate).getTime()) {
        return false;
      }
      if (!normalizedQuery) {
        if (keywords.length === 0) {
          return true;
        }
        return keywords.some((keyword) => matchesPreprintKeyword(preprint, keyword));
      }
      return scoreSearchResult(preprint, query) > 0
        && (keywords.length === 0 || keywords.some((keyword) => matchesPreprintKeyword(preprint, keyword)));
    })
    .map((preprint) => ({
      preprint,
      score: scoreSearchResult(preprint, query) + keywords.reduce((total, keyword) => total + scoreSearchResult(preprint, keyword), 0),
    }));

  const highlightQuery = [query.trim(), ...keywords].filter(Boolean).join(' ');

  const results = baseResults
    .sort((left, right) => {
      if (sortBy === 'Newest First') {
        return new Date(right.preprint.date).getTime() - new Date(left.preprint.date).getTime();
      }
      if (sortBy === 'Most Cited') {
        return (right.preprint.citations ?? 0) - (left.preprint.citations ?? 0);
      }
      if (sortBy === 'User Rating') {
        return (right.preprint.rating ?? 0) - (left.preprint.rating ?? 0);
      }
      if (sortBy === 'Number of Saves') {
        return (right.preprint.savesCount ?? 0) - (left.preprint.savesCount ?? 0);
      }
      if (sortBy === 'Trending Score') {
        return (right.preprint.views ?? 0) - (left.preprint.views ?? 0);
      }
      return right.score - left.score || new Date(right.preprint.date).getTime() - new Date(left.preprint.date).getTime();
    })
    .slice(0, limit)
    .map((item) => ({
      ...item.preprint,
      searchSnippet: buildSearchSnippet(item.preprint, highlightQuery),
      matchedFields: getMatchedFields(item.preprint, highlightQuery),
    }));

  if (normalizedQuery.length >= 2) {
    await coreStore.recordSearchAnalytics({
      userId: req.userId!,
      queryText: query.trim(),
      normalizedQuery,
      resultCount: results.length,
      searchedAt: getDbTimestamp(),
    });
  }

  res.json({
    total: results.length,
    preprints: results,
  });
});

app.get('/api/content/search/suggestions', requireAuth, async (req: AuthenticatedRequest, res) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
  if (!query) {
    return res.json({ suggestions: [] });
  }
  const ingestedPreprints = await contentStore.listPreprints(250);
  const preprints = (ingestedPreprints.length > 0 ? ingestedPreprints.map(mapIngestedRecordToPreprint) : PREPRINTS);
  const suggestionSet = new Map<string, { label: string; type: 'title' | 'author' | 'tag' | 'doi' | 'query'; score: number }>();

  (await coreStore.listPopularSearches(5, query)).forEach((popularSearch) => {
    suggestionSet.set(`query:${popularSearch.display_query}`, {
      label: popularSearch.display_query,
      type: 'query',
      score: 130 + Number(popularSearch.search_count),
    });
  });

  preprints.forEach((preprint) => {
    const candidates: Array<{ label: string; type: 'title' | 'author' | 'tag' | 'doi'; haystack: string; score: number }> = [
      { label: preprint.title, type: 'title', haystack: preprint.title.toLowerCase(), score: 100 },
      ...(preprint.authors.map((author) => ({ label: author, type: 'author' as const, haystack: author.toLowerCase(), score: 70 }))),
      ...(preprint.tags.map((tag) => ({ label: tag, type: 'tag' as const, haystack: tag.toLowerCase(), score: 50 }))),
      ...(preprint.doi ? [{ label: preprint.doi, type: 'doi' as const, haystack: preprint.doi.toLowerCase(), score: 80 }] : []),
    ];
    candidates.forEach((candidate) => {
      if (!candidate.haystack.includes(query)) {
        return;
      }
      const existing = suggestionSet.get(`${candidate.type}:${candidate.label}`);
      if (!existing || existing.score < candidate.score) {
        suggestionSet.set(`${candidate.type}:${candidate.label}`, {
          label: candidate.label,
          type: candidate.type,
          score: candidate.score,
        });
      }
    });
  });

  const suggestions = Array.from(suggestionSet.values())
    .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label))
    .slice(0, 8)
    .map(({ label, type }) => ({ label, type }));

  res.json({ suggestions });
});

app.get('/api/content/search/analytics', requireAuth, async (_req: AuthenticatedRequest, res) => {
  res.json({
    popularSearches: (await coreStore.listPopularSearches(8)).map(buildPopularSearch),
  });
});

app.get('/api/searches', requireAuth, async (req: AuthenticatedRequest, res) => {
  res.json({
    searches: (await coreStore.listSavedSearchesByUserId(req.userId!)).map(buildSavedSearch),
  });
});

app.post('/api/searches', requireAuth, requireCsrf, async (req: AuthenticatedRequest, res) => {
  const body = req.body as {
    label?: string;
    queryText?: string;
    filters?: {
      sources?: string[];
      categories?: string[];
      publicationType?: string;
      sortBy?: string;
      startDate?: string;
      endDate?: string;
    };
  };
  if (!body.label?.trim()) {
    return res.status(400).json({ error: 'Search label is required' });
  }
  const savedSearch = await coreStore.upsertSavedSearch({
    userId: req.userId!,
    label: body.label.trim(),
    queryText: body.queryText?.trim() ?? '',
    filtersJson: JSON.stringify(body.filters ?? {}),
    savedAt: getDbTimestamp(),
  });
  res.status(201).json({ search: buildSavedSearch(savedSearch) });
});

app.delete('/api/searches/:searchId', requireAuth, requireCsrf, async (req: AuthenticatedRequest, res) => {
  await coreStore.deleteSavedSearch(req.userId!, req.params.searchId);
  res.status(204).send();
});

app.get('/api/content/sources', requireAuth, async (_req: AuthenticatedRequest, res) => {
  res.json({
    sources: contentSources.map((source) => ({
      id: source.id,
      label: source.label,
      description: source.description,
    })),
  });
});

app.get('/api/content/sync-definitions', requireAuth, async (_req: AuthenticatedRequest, res) => {
  res.json({
    syncDefinitions: (await contentStore.listSyncDefinitions()).map(buildSyncDefinition),
  });
});

app.post('/api/content/sync-definitions', requireAuth, requireCsrf, async (req: AuthenticatedRequest, res) => {
  try {
    const input = parseOrThrow(contentSyncDefinitionSchema, req.body);
    const source = getContentSource(input.sourceId);
    if (!source) {
      return res.status(404).json({ error: 'Unknown content source' });
    }
    const definition = await contentStore.upsertSyncDefinition({
      id: input.id,
      sourceName: source.id,
      queryText: input.query,
      maxResults: input.maxResults,
      intervalMinutes: input.intervalMinutes,
      enabled: input.enabled,
    });
    res.status(201).json({ syncDefinition: buildSyncDefinition(definition) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save sync definition';
    if (error instanceof Error && error.name === 'ValidationError') {
      return res.status(400).json({ error: message });
    }
    res.status(500).json({ error: message });
  }
});

app.delete('/api/content/sync-definitions/:definitionId', requireAuth, requireCsrf, async (req: AuthenticatedRequest, res) => {
  await contentStore.deleteSyncDefinition(req.params.definitionId);
  res.status(204).send();
});

const handleContentIngestRequest = async (req: AuthenticatedRequest, res: Response, sourceId: string) => {
  try {
    const input = parseOrThrow(contentIngestSchema, req.body);
    const source = getContentSource(sourceId);
    if (!source) {
      return res.status(404).json({ error: 'Unknown content source' });
    }
    const payload = await executeSourceIngest(source.id, input.query, input.maxResults);
    await notifyUser({
      userId: req.userId!,
      type: 'feed',
      title: `${source.label} sync completed`,
      description: `Imported ${payload.imported} ${source.label} records for "${input.query}".`,
      createdAt: getDbTimestamp(),
      actionUrl: '/home',
      emailOverride: false,
      pushOverride: false,
    });
    sendLiveEvent(req.userId!, {
      type: 'content-updated',
      sourceLabel: payload.dataset.sourceLabel,
      total: payload.dataset.preprints.length,
    });
    res.status(201).json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to ingest content';
    if (error instanceof Error && error.name === 'ValidationError') {
      return res.status(400).json({ error: message });
    }
    return res.status(502).json({ error: message });
  }
};

app.post('/api/content/ingest/:sourceId', requireAuth, requireCsrf, async (req: AuthenticatedRequest, res) => {
  return handleContentIngestRequest(req, res, req.params.sourceId);
});

app.post('/api/profile/publications/import', requireAuth, requireCsrf, async (req: AuthenticatedRequest, res) => {
  let input;
  try {
    input = parseOrThrow(profilePublicationImportSchema, req.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid publication import request';
    if (error instanceof Error && error.name === 'ValidationError') {
      return res.status(400).json({ error: message });
    }
    throw error;
  }

  const user = await coreStore.findUserById(req.userId!);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  try {
    const authorName = input.authorName?.trim() || user.name;
    const importedPreprints = await fetchProfilePublicationsFromSource({
      source: input.source,
      authorName,
      orcidId: input.orcidId,
      maxResults: input.maxResults,
    });

    if (importedPreprints.length === 0) {
      return res.status(200).json({
        imported: 0,
        sourceLabel: input.source === 'orcid' ? 'ORCID' : 'arXiv',
        dataset: await buildContentDatasetPayload(1000),
      });
    }

    const syncRun = await contentStore.createSyncRun(
      input.source === 'orcid' ? 'ORCID' : 'arXiv',
      `profile:${req.userId}:${authorName}`,
    );
    await contentStore.upsertPreprints(importedPreprints.map((preprint) => ({
      ...preprint,
      syncRunId: syncRun.id,
    })));
    await contentStore.completeSyncRun(syncRun.id, 'succeeded', importedPreprints.length);

    await notifyUser({
      userId: req.userId!,
      type: 'feed',
      title: `${input.source === 'orcid' ? 'ORCID' : 'arXiv'} import completed`,
      description: `Imported ${importedPreprints.length} publications for ${authorName}.`,
      createdAt: getDbTimestamp(),
      actionUrl: '/profile',
      emailOverride: false,
      pushOverride: false,
    });
    sendLiveEvent(req.userId!, {
      type: 'content-updated',
      sourceLabel: input.source === 'orcid' ? 'ORCID profile import' : 'arXiv author import',
      total: importedPreprints.length,
    });
    return res.status(201).json({
      imported: importedPreprints.length,
      sourceLabel: input.source === 'orcid' ? 'ORCID' : 'arXiv',
      dataset: await buildContentDatasetPayload(1000),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to import publications';
    return res.status(502).json({ error: message });
  }
});

app.post('/api/auth/register', authRateLimiter, async (req, res) => {
  let input;
  try {
    input = parseOrThrow(registerSchema, req.body);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid registration request';
    if (error instanceof Error && error.name === 'ValidationError') {
      return res.status(400).json({ error: message });
    }
    throw error;
  }

  const { name, email, password, affiliation } = input;

  const existing = await coreStore.findUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'Email is already registered' });
  }

  const id = email.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  await coreStore.createUser({
    id,
    name,
    email: email.toLowerCase(),
    passwordHash: hashUserPassword(password),
    orcidId: null,
    affiliation,
    institutionId: null,
    imageUrl: `https://i.pravatar.cc/150?u=${id}`,
    bio: 'New member of the Preprint Explorer research network.',
    title: '',
    isEmailVerified: false,
    isAffiliationVerified: false,
  });
  await coreStore.ensureDefaultSettings(id);
  await securityStore.ensureTwoFactorRecord(id);

  const client = getClientContext(req);
  const session = await authStore.createSession(id, client);
  await securityStore.createSecurityEvent(id, 'login', 'Account created', {
    deviceLabel: client.deviceLabel,
    locationLabel: client.locationLabel,
  });
  setSessionCookie(res, session.token);
  res.status(201).json(await authResponse(id, session.csrfToken));
});

app.post('/api/auth/login', authRateLimiter, async (req, res) => {
  const { email, password } = parseOrThrow(loginSchema, req.body);

  const user = await coreStore.findUserByEmail(email.toLowerCase()) as (UserRow & { password_hash: string }) | undefined;
  if (!user || !verifyUserPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const client = getClientContext(req);
  const trustedDevice = await getTrustedDeviceFromCookie(req, user.id);

  if (await hasTwoFactorEnabled(user.id) && !trustedDevice) {
    const challenge = await authStore.createLoginChallenge(user.id);
    return res.json({
      requiresTwoFactor: true,
      challengeToken: challenge.token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  }

  const session = await authStore.createSession(user.id, {
    ...client,
    trustedDeviceId: trustedDevice?.id ?? null,
  });
  await securityStore.createSecurityEvent(user.id, trustedDevice ? 'device' : 'login', trustedDevice ? 'Signed in with trusted device' : 'Logged in', {
    deviceLabel: client.deviceLabel,
    locationLabel: client.locationLabel,
  });
  setSessionCookie(res, session.token);
  res.json(await authResponse(user.id, session.csrfToken));
});

app.post('/api/auth/2fa/login', authRateLimiter, async (req, res) => {
  const { challengeToken, code, rememberDevice } = parseOrThrow(completeTwoFactorLoginSchema, req.body);
  const userId = await authStore.consumeLoginChallenge(challengeToken);
  if (!userId) {
    return res.status(400).json({ error: 'Invalid or expired login challenge' });
  }
  if (!await verifyTwoFactorCode(userId, code)) {
    return res.status(401).json({ error: 'Invalid two-factor code' });
  }
  const client = getClientContext(req);
  let trustedDeviceId: string | null = null;
  if (rememberDevice) {
    const trustedDevice = await authStore.createTrustedDevice(userId, {
      deviceLabel: client.deviceLabel,
      browser: client.browser,
      platform: client.platform,
      locationLabel: client.locationLabel,
    });
    trustedDeviceId = trustedDevice.id;
    setTrustedDeviceCookie(res, trustedDevice.token, trustedDevice.expiresAt);
    await securityStore.createSecurityEvent(userId, 'device', 'Trusted device saved', {
      deviceLabel: client.deviceLabel,
      locationLabel: client.locationLabel,
    });
  }
  const session = await authStore.createSession(userId, {
    ...client,
    trustedDeviceId,
  });
  await securityStore.createSecurityEvent(userId, 'login', 'Two-factor sign-in completed', {
    deviceLabel: client.deviceLabel,
    locationLabel: client.locationLabel,
  });
  setSessionCookie(res, session.token);
  res.json(await authResponse(userId, session.csrfToken));
});

app.post('/api/auth/logout', requireAuth, requireCsrf, async (req: AuthenticatedRequest, res) => {
  const token = req.cookies?.[sessionCookieName] as string | undefined;
  if (token) {
    await authStore.destroySession(token);
  }
  await securityStore.createSecurityEvent(req.userId!, 'session', 'Signed out', {
    deviceLabel: getClientContext(req).deviceLabel,
    locationLabel: getClientContext(req).locationLabel,
  });
  clearSessionCookie(res);
  res.status(204).send();
});

app.get('/api/auth/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  res.json(await authResponse(req.userId!, req.csrfToken!));
});

app.post('/api/auth/request-email-verification', requireAuth, requireCsrf, async (req: AuthenticatedRequest, res) => {
  const token = await authStore.createEmailVerificationToken(req.userId!);
  const user = await coreStore.findUserById(req.userId!);
  if (user?.email) {
    await sendVerificationEmail(user.email, token.token);
  }
  const payload: { message: string; debugToken?: string } = {
    message: 'Verification email queued.',
  };
  if (!isProduction && !process.env.SMTP_URL) {
    payload.debugToken = token.token;
  }
  res.status(201).json(payload);
});

app.post('/api/auth/verify-email', async (req, res) => {
  const { token } = req.body as { token?: string };
  if (!token) {
    return res.status(400).json({ error: 'Verification token is required' });
  }
  const userId = await authStore.consumeEmailVerificationToken(token);
  if (!userId) {
    return res.status(400).json({ error: 'Invalid or expired verification token' });
  }
  await coreStore.markEmailVerified(userId);
  res.status(204).send();
});

app.post('/api/auth/request-password-reset', authRateLimiter, async (req, res) => {
  const { email } = parseOrThrow(passwordResetRequestSchema, req.body);
  const user = await coreStore.findUserByEmail(email.toLowerCase());
  const payload: { message: string; debugToken?: string } = {
    message: 'If that account exists, a password reset email has been queued.',
  };
  if (user) {
    const token = await authStore.createPasswordResetToken(user.id);
    await sendPasswordResetEmail(user.email, token.token);
    if (!isProduction && !process.env.SMTP_URL) {
      payload.debugToken = token.token;
    }
  }
  res.status(201).json(payload);
});

app.post('/api/auth/reset-password', authRateLimiter, async (req, res) => {
  const { token, password } = parseOrThrow(passwordResetSchema, req.body);
  const userId = await authStore.consumePasswordResetToken(token);
  if (!userId) {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }
  await coreStore.updateUserPassword(userId, hashUserPassword(password));
  await authStore.destroyAllUserSessions(userId);
  await securityStore.createSecurityEvent(userId, 'password', 'Password reset completed', {
    deviceLabel: 'Account recovery',
    locationLabel: 'Verification token flow',
    isAlert: true,
  });
  res.status(204).send();
});

app.get('/api/auth/csrf', requireAuth, (req: AuthenticatedRequest, res) => {
  res.json({ csrfToken: req.csrfToken });
});

app.post('/api/auth/re-auth', requireAuth, requireCsrf, async (req: AuthenticatedRequest, res) => {
  const { currentPassword, twoFactorCode } = req.body as { currentPassword?: string; twoFactorCode?: string };
  const usedPassword = Boolean(currentPassword);
  const usedTwoFactor = Boolean(twoFactorCode);
  if (!usedPassword && !usedTwoFactor) {
    return res.status(400).json({ error: 'Password or two-factor code is required' });
  }
  if (usedPassword) {
    const user = await coreStore.findUserById(req.userId!);
    if (!user || !verifyUserPassword(currentPassword!, user.password_hash)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
  } else {
    if (!await verifyTwoFactorCode(req.userId!, twoFactorCode!)) {
      return res.status(401).json({ error: 'Two-factor code is incorrect' });
    }
  }
  await authStore.markSessionRecentlyAuthenticated(req.sessionToken!);
  req.recentAuthAt = getDbTimestamp();
  await securityStore.createSecurityEvent(req.userId!, 'session', usedTwoFactor ? 'Recent authentication confirmed with 2FA' : 'Recent authentication confirmed with password', {
    deviceLabel: getClientContext(req).deviceLabel,
    locationLabel: getClientContext(req).locationLabel,
  });
  res.status(204).send();
});

app.post('/api/auth/re-auth/passkey/options', requireAuth, requireCsrf, async (req: AuthenticatedRequest, res) => {
  try {
    const passkeys = await getPasskeys(req.userId!);
    if (passkeys.length === 0) {
      return res.status(400).json({ error: 'No passkeys registered for this account' });
    }
    const options = await generateAuthenticationOptions({
      rpID: webAuthnRpID,
      allowCredentials: passkeys.map(passkey => ({
        id: passkey.id,
        transports: parseTransports(passkey.transports_json) as ('ble' | 'cable' | 'hybrid' | 'internal' | 'nfc' | 'smart-card' | 'usb')[],
      })),
      userVerification: 'preferred',
    });
    const challenge = await authStore.createWebAuthnChallenge(req.userId!, options.challenge, 'authentication');
    res.status(201).json({
      challengeId: challenge.id,
      options,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to start passkey re-authentication' });
  }
});

app.post('/api/auth/re-auth/passkey/verify', requireAuth, requireCsrf, async (req: AuthenticatedRequest, res) => {
  try {
    const { challengeId, response } = req.body as {
      challengeId?: string;
      response?: AuthenticationResponseJSON;
    };
    if (!challengeId || !response) {
      return res.status(400).json({ error: 'Passkey challenge and response are required' });
    }
    const challenge = await authStore.consumeWebAuthnChallenge(challengeId, 'authentication');
    if (!challenge || challenge.user_id !== req.userId) {
      return res.status(400).json({ error: 'Invalid or expired passkey authentication challenge' });
    }

    const verification = await verifyPasskeyAssertion(req.userId!, challenge.challenge, response);
    if (!verification.passkey) {
      return res.status(404).json({ error: 'Passkey not found for this account' });
    }
    if (!verification.verified) {
      return res.status(401).json({ error: 'Passkey authentication failed' });
    }

    await authStore.markSessionRecentlyAuthenticated(req.sessionToken!);
    req.recentAuthAt = getDbTimestamp();
    await securityStore.createSecurityEvent(req.userId!, 'session', 'Recent authentication confirmed with passkey', {
      deviceLabel: getClientContext(req).deviceLabel,
      locationLabel: getClientContext(req).locationLabel,
    });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: 'Unable to verify passkey re-authentication' });
  }
});

app.post('/api/auth/rotate-session', requireAuth, requireCsrf, async (req: AuthenticatedRequest, res) => {
  const client = getClientContext(req);
  const rotated = await authStore.rotateSession(req.sessionToken!, req.userId!);
  await securityStore.updateRotatedSession(rotated.token, {
    userAgent: client.userAgent,
    deviceLabel: client.deviceLabel,
    locationLabel: client.locationLabel,
    trustedDeviceId: req.trustedDeviceId ?? null,
    recentAuthAt: getDbTimestamp(),
  });
  await securityStore.createSecurityEvent(req.userId!, 'session', 'Session rotated', {
    deviceLabel: client.deviceLabel,
    locationLabel: client.locationLabel,
  });
  setSessionCookie(res, rotated.token);
  res.json(await authResponse(req.userId!, rotated.csrfToken));
});

app.post('/api/auth/logout-others', requireAuth, requireCsrf, async (req: AuthenticatedRequest, res) => {
  await authStore.destroyOtherSessions(req.userId!, req.sessionToken!);
  await securityStore.createSecurityEvent(req.userId!, 'session', 'Signed out of other sessions', {
    deviceLabel: getClientContext(req).deviceLabel,
    locationLabel: getClientContext(req).locationLabel,
  });
  res.status(204).send();
});

app.post('/api/auth/change-password', requireAuth, requireCsrf, async (req: AuthenticatedRequest, res) => {
  const { currentPassword, newPassword } = parseOrThrow(changePasswordSchema, req.body);
  const user = await coreStore.findUserById(req.userId!);
  if (!user || !verifyUserPassword(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  await coreStore.updateUserPassword(req.userId!, hashUserPassword(newPassword));
  const rotated = await authStore.rotateSession(req.sessionToken!, req.userId!);
  const client = getClientContext(req);
  await securityStore.updateRotatedSession(rotated.token, {
    userAgent: client.userAgent,
    deviceLabel: client.deviceLabel,
    locationLabel: client.locationLabel,
    trustedDeviceId: req.trustedDeviceId ?? null,
    recentAuthAt: getDbTimestamp(),
  });
  await securityStore.createSecurityEvent(req.userId!, 'password', 'Password changed', {
    deviceLabel: client.deviceLabel,
    locationLabel: client.locationLabel,
    isAlert: true,
  });
  setSessionCookie(res, rotated.token);
  res.json({ csrfToken: rotated.csrfToken });
});

app.get('/api/auth/2fa/status', requireAuth, async (req: AuthenticatedRequest, res) => {
  const row = await getTwoFactorRow(req.userId!);
  const backupCodes = row.backup_codes_json ? JSON.parse(row.backup_codes_json) as string[] : [];
  res.json({
    enabled: Boolean(row.enabled && row.secret),
    hasPendingSetup: Boolean(row.pending_secret),
    backupCodesRemaining: backupCodes.length,
  });
});

app.post('/api/auth/2fa/setup', requireAuth, requireCsrf, async (req: AuthenticatedRequest, res) => {
  await securityStore.ensureTwoFactorRecord(req.userId!);
  const secret = otplib.generateSecret();
  const user = await coreStore.findUserById(req.userId!);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  const issuer = 'Preprint Explorer';
  const otpauthUrl = otplib.generateURI({ label: user.email, issuer, secret });
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
  await securityStore.updateTwoFactorPendingSecret(req.userId!, secret);
  res.status(201).json({
    secret,
    otpauthUrl,
    qrCodeDataUrl,
  });
});

app.post('/api/auth/2fa/enable', requireAuth, requireCsrf, async (req: AuthenticatedRequest, res) => {
  const { code } = req.body as { code?: string };
  if (!code) {
    return res.status(400).json({ error: 'Verification code is required' });
  }
  const row = await getTwoFactorRow(req.userId!);
  if (!row.pending_secret || !otplib.verifySync({ token: code.replace(/\s+/g, '').trim(), secret: row.pending_secret })) {
    return res.status(401).json({ error: 'Invalid authenticator code' });
  }
  const backupCodes = generateBackupCodes();
  await securityStore.enableTwoFactor(req.userId!, row.pending_secret, JSON.stringify(backupCodes.map(hashBackupCode)));
  await securityStore.createSecurityEvent(req.userId!, '2fa', 'Two-factor authentication enabled', {
    deviceLabel: getClientContext(req).deviceLabel,
    locationLabel: getClientContext(req).locationLabel,
  });
  res.json({
    backupCodes,
  });
});

app.post('/api/auth/2fa/disable', requireAuth, requireCsrf, async (req: AuthenticatedRequest, res) => {
  if (!hasRecentAuth(req)) {
    return res.status(403).json({ error: 'Recent authentication required' });
  }
  const { code } = req.body as { code?: string };
  if (!code || !await verifyTwoFactorCode(req.userId!, code)) {
    return res.status(401).json({ error: 'Invalid two-factor code' });
  }
  if (await wouldLeaveAccountWithoutRecovery(req.userId!, { removeTwoFactor: true })) {
    return res.status(409).json({
      error: 'Disabling 2FA would leave this account without a verified email or any passkeys. Verify your email or add a passkey first.',
    });
  }
  await securityStore.disableTwoFactor(req.userId!);
  clearTrustedDeviceCookie(res);
  await securityStore.deleteTrustedDevicesForUser(req.userId!);
  await securityStore.clearTrustedDeviceForUser(req.userId!);
  await securityStore.createSecurityEvent(req.userId!, '2fa', 'Two-factor authentication disabled', {
    deviceLabel: getClientContext(req).deviceLabel,
    locationLabel: getClientContext(req).locationLabel,
    isAlert: true,
  });
  res.status(204).send();
});

app.post('/api/auth/2fa/regenerate-backup-codes', requireAuth, requireCsrf, async (req: AuthenticatedRequest, res) => {
  const { code } = req.body as { code?: string };
  if (!code || !await verifyTwoFactorCode(req.userId!, code)) {
    return res.status(401).json({ error: 'Invalid two-factor code' });
  }
  const backupCodes = generateBackupCodes();
  await securityStore.updateBackupCodes(req.userId!, JSON.stringify(backupCodes.map(hashBackupCode)));
  await securityStore.createSecurityEvent(req.userId!, '2fa', 'Backup codes regenerated', {
    deviceLabel: getClientContext(req).deviceLabel,
    locationLabel: getClientContext(req).locationLabel,
  });
  res.json({ backupCodes });
});

app.get('/api/auth/trusted-devices', requireAuth, async (req: AuthenticatedRequest, res) => {
  res.json({
    devices: await listTrustedDevices(req.userId!, req.sessionToken, req.trustedDeviceId),
  });
});

app.delete('/api/auth/trusted-devices/:deviceId', requireAuth, requireCsrf, async (req: AuthenticatedRequest, res) => {
  const [kind, rawId] = req.params.deviceId.split(':');
  if (!kind || !rawId) {
    return res.status(400).json({ error: 'Invalid device id' });
  }

  if (kind === 'session') {
    if (rawId === req.sessionToken) {
      return res.status(400).json({ error: 'Cannot revoke the current session here' });
    }
    await securityStore.deleteSessionForUser(rawId, req.userId!);
  } else if (kind === 'trusted') {
    if (rawId === req.trustedDeviceId) {
      clearTrustedDeviceCookie(res);
    }
    await authStore.revokeTrustedDevice(rawId, req.userId!);
  } else {
    return res.status(400).json({ error: 'Invalid device id' });
  }

  await securityStore.createSecurityEvent(req.userId!, 'device', 'Device access revoked', {
    deviceLabel: getClientContext(req).deviceLabel,
    locationLabel: getClientContext(req).locationLabel,
    isAlert: true,
  });

  res.status(204).send();
});

app.get('/api/auth/security-events', requireAuth, async (req: AuthenticatedRequest, res) => {
  res.json({
    events: await listSecurityEvents(req.userId!, req.sessionToken),
  });
});

app.get('/api/auth/passkeys', requireAuth, async (req: AuthenticatedRequest, res) => {
  res.json({
    passkeys: (await getPasskeys(req.userId!)).map(buildPasskey),
  });
});

app.get('/api/auth/security-summary', requireAuth, async (req: AuthenticatedRequest, res) => {
  res.json(await getSecuritySummary(req.userId!));
});

app.get('/api/notifications', requireAuth, async (req: AuthenticatedRequest, res) => {
  res.json({
    notifications: await listNotifications(req.userId!),
  });
});

app.get('/api/collections', requireAuth, async (req: AuthenticatedRequest, res) => {
  res.json({
    collections: await buildCollectionsForUser(req.userId!),
  });
});

app.post('/api/collections', requireAuth, requireCsrf, async (req: AuthenticatedRequest, res) => {
  const payload = parseOrThrow(createCollectionSchema, req.body);
  const createdAt = getDbTimestamp();
  await coreStore.createCollection({
    ownerUserId: req.userId!,
    name: payload.name,
    description: payload.description || null,
    imageUrl: payload.imageUrl || `https://picsum.photos/seed/${encodeURIComponent(payload.name)}/400/400`,
    shareLinkToken: `collection-${crypto.randomUUID().slice(0, 12)}`,
    createdAt,
  });
  res.status(201).json({
    collections: await buildCollectionsForUser(req.userId!),
  });
});

app.patch('/api/collections/:collectionId', requireAuth, requireCsrf, async (req: AuthenticatedRequest, res) => {
  const payload = parseOrThrow(updateCollectionSchema, req.body);
  const updated = await coreStore.updateCollectionMetadata({
    collectionId: req.params.collectionId,
    ownerUserId: req.userId!,
    name: payload.name,
    description: payload.description || null,
    imageUrl: payload.imageUrl || `https://picsum.photos/seed/${encodeURIComponent(payload.name)}/400/400`,
    updatedAt: getDbTimestamp(),
  });
  if (!updated) {
    return res.status(404).json({ error: 'Collection not found or not editable' });
  }
  res.json({
    collections: await buildCollectionsForUser(req.userId!),
  });
});

app.patch('/api/collections/:collectionId/papers', requireAuth, requireCsrf, async (req: AuthenticatedRequest, res) => {
  const payload = parseOrThrow(updateCollectionPapersSchema, req.body);
  const access = await getCollectionAccessForUser(req.userId!, req.params.collectionId);
  if (!access.collection) {
    return res.status(404).json({ error: 'Collection not found' });
  }
  if (!['owner', 'editor'].includes(access.role)) {
    return res.status(403).json({ error: 'You do not have permission to edit this collection' });
  }
  await coreStore.replaceCollectionPreprintIds({
    collectionId: req.params.collectionId,
    preprintIds: payload.preprintIds,
    updatedAt: getDbTimestamp(),
  });
  res.json({
    collections: await buildCollectionsForUser(req.userId!),
  });
});

app.patch('/api/collections/:collectionId/access', requireAuth, requireCsrf, async (req: AuthenticatedRequest, res) => {
  const payload = parseOrThrow(updateCollectionAccessSchema, req.body);
  const access = await getCollectionAccessForUser(req.userId!, req.params.collectionId);
  if (!access.collection) {
    return res.status(404).json({ error: 'Collection not found' });
  }
  if (access.role !== 'owner') {
    return res.status(403).json({ error: 'Only the collection owner can manage access' });
  }
  await coreStore.replaceCollectionCollaborators({
    collectionId: req.params.collectionId,
    collaborators: payload.collaborators.map((entry) => ({
      email: entry.email.toLowerCase(),
      role: entry.role,
    })),
    updatedAt: getDbTimestamp(),
  });
  res.json({
    collections: await buildCollectionsForUser(req.userId!),
  });
});

app.post('/api/notifications/mark-read', requireAuth, requireCsrf, async (req: AuthenticatedRequest, res) => {
  await coreStore.markNotificationsRead(req.userId!);
  sendLiveEvent(req.userId!, { type: 'notifications-updated' });
  res.status(204).send();
});

app.post('/api/notifications/:notificationId/mark-read', requireAuth, requireCsrf, async (req: AuthenticatedRequest, res) => {
  await coreStore.markNotificationRead(req.userId!, req.params.notificationId);
  sendLiveEvent(req.userId!, { type: 'notifications-updated' });
  res.status(204).send();
});

app.get('/api/moderation/blocked-users', requireAuth, async (req: AuthenticatedRequest, res) => {
  res.json({
    blockedUserIds: await coreStore.listBlockedUserIds(req.userId!),
  });
});

app.post('/api/moderation/block-user', requireAuth, requireCsrf, moderationRateLimiter, async (req: AuthenticatedRequest, res) => {
  const { blockedUserId } = parseOrThrow(blockUserSchema, req.body);
  if (blockedUserId === req.userId) {
    return res.status(400).json({ error: 'You cannot block yourself' });
  }
  await coreStore.createBlockedUser(req.userId!, blockedUserId, getDbTimestamp());
  await notifyUser({
    userId: req.userId!,
    type: 'account',
    title: 'User blocked',
    description: 'This user can no longer follow, message, or share papers with you.',
    createdAt: getDbTimestamp(),
    actionUrl: '/notifications/system',
    emailOverride: true,
    pushOverride: true,
  });
  broadcastLiveEvent([req.userId!, blockedUserId], { type: 'social-updated' });
  res.status(201).json({
    blockedUserIds: await coreStore.listBlockedUserIds(req.userId!),
  });
});

app.delete('/api/moderation/block-user/:blockedUserId', requireAuth, requireCsrf, moderationRateLimiter, async (req: AuthenticatedRequest, res) => {
  await coreStore.deleteBlockedUser(req.userId!, req.params.blockedUserId);
  broadcastLiveEvent([req.userId!, req.params.blockedUserId], { type: 'social-updated' });
  res.status(204).send();
});

app.post('/api/moderation/report', requireAuth, requireCsrf, moderationRateLimiter, async (req: AuthenticatedRequest, res) => {
  const input = parseOrThrow(reportSchema, req.body);
  let report = await coreStore.createModerationReport({
    reporterUserId: req.userId!,
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason,
    details: input.details,
    createdAt: getDbTimestamp(),
  });
  report = await applyModerationPolicy(report);
  await notifyUser({
    userId: req.userId!,
    type: 'moderation',
    title: 'Report submitted',
    description: report.escalated_at
      ? `Your ${input.targetType} report was queued and escalated for priority review.`
      : `Your ${input.targetType} report is queued for review.`,
    createdAt: getDbTimestamp(),
    actionUrl: '/notifications/system',
    emailOverride: true,
    pushOverride: true,
  });
  res.status(201).json({ reportId: report.id });
});

app.get('/api/admin/moderation/reports', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  const rawStatus = typeof req.query.status === 'string' ? req.query.status : undefined;
  const statuses = rawStatus && rawStatus !== 'all'
    ? [rawStatus as 'open' | 'reviewing' | 'resolved' | 'dismissed']
    : undefined;
  const reports = await Promise.all((await coreStore.listModerationReports(statuses)).map(buildModerationReport));
  const moderators = (await coreStore.listUsers())
    .filter((user) => Boolean(user.is_admin))
    .map((user) => ({ id: user.id, name: user.name }));
  res.json({ reports, moderators });
});

app.get('/api/admin/product-updates', requireAuth, requireAdmin, async (_req: AuthenticatedRequest, res) => {
  const announcements = await Promise.all((await coreStore.listProductAnnouncements()).map(async (announcement) => {
    const author = await coreStore.findUserById(announcement.created_by_user_id);
    return {
      ...buildProductAnnouncement(announcement),
      createdByName: author?.name ?? 'Admin',
    };
  }));
  res.json({ announcements });
});

app.post('/api/admin/product-updates', requireAuth, requireAdmin, requireCsrf, moderationRateLimiter, async (req: AuthenticatedRequest, res) => {
  const input = parseOrThrow(productAnnouncementSchema, req.body);
  const createdAt = getDbTimestamp();
  const announcement = await coreStore.createProductAnnouncement({
    title: input.title,
    message: input.message,
    actionUrl: input.actionUrl?.trim() || '/notifications/system',
    createdByUserId: req.userId!,
    createdAt,
  });
  const users = await coreStore.listUsers();
  for (const user of users) {
    const settings = await getSettings(user.id);
    if (!settings.productUpdates) {
      continue;
    }
    await notifyUser({
      userId: user.id,
      type: 'product',
      title: input.title,
      description: input.message,
      createdAt,
      actionUrl: announcement.action_url ?? '/notifications/system',
      emailOverride: true,
      pushOverride: true,
    });
  }
  res.status(201).json({
    announcement: {
      ...buildProductAnnouncement(announcement),
      createdByName: (await coreStore.findUserById(req.userId!))?.name ?? 'Admin',
    },
  });
});

app.get('/api/admin/moderation/reports/:reportId', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  const report = (await coreStore.listModerationReports()).find((item) => item.id === req.params.reportId);
  if (!report) {
    return res.status(404).json({ error: 'Moderation report not found' });
  }
  const actions = await Promise.all((await coreStore.listModerationActionsByReportId(report.id)).map(buildModerationAction));
  res.json({ report: await buildModerationReport(report), actions });
});

app.post('/api/admin/moderation/reports/:reportId/assign', requireAuth, requireAdmin, requireCsrf, moderationRateLimiter, async (req: AuthenticatedRequest, res) => {
  const input = parseOrThrow(assignModerationReportSchema, req.body);
  const report = await coreStore.assignModerationReport(req.params.reportId, input.assignedToUserId, getDbTimestamp(), req.userId!);
  if (!report) {
    return res.status(404).json({ error: 'Moderation report not found' });
  }
  res.json({ report: await buildModerationReport(report) });
});

app.post('/api/admin/moderation/reports/:reportId/escalate', requireAuth, requireAdmin, requireCsrf, moderationRateLimiter, async (req: AuthenticatedRequest, res) => {
  const input = parseOrThrow(escalateModerationReportSchema, req.body);
  const report = await coreStore.escalateModerationReport({
    reportId: req.params.reportId,
    escalationReason: input.escalationReason,
    escalatedAt: getDbTimestamp(),
    actorUserId: req.userId!,
  });
  if (!report) {
    return res.status(404).json({ error: 'Moderation report not found' });
  }
  await emitMonitoringEvent({
    type: 'moderation_report_escalated',
    severity: 'warning',
    timestamp: new Date().toISOString(),
    payload: {
      reportId: report.id,
      targetType: report.target_type,
      targetId: report.target_id,
      actorUserId: req.userId,
      escalationReason: input.escalationReason,
    },
  });
  res.json({ report: await buildModerationReport(report) });
});

app.post('/api/admin/moderation/reports/bulk', requireAuth, requireAdmin, requireCsrf, moderationRateLimiter, async (req: AuthenticatedRequest, res) => {
  const input = parseOrThrow(bulkModerationSchema, req.body);
  const updatedReports: Awaited<ReturnType<typeof buildModerationReport>>[] = [];

  for (const reportId of input.reportIds) {
    if (input.action === 'assign') {
      const report = await coreStore.assignModerationReport(reportId, input.assignedToUserId ?? null, getDbTimestamp(), req.userId!);
      if (report) {
        updatedReports.push(await buildModerationReport(report));
      }
      continue;
    }
    if (input.action === 'review') {
      if (!input.status) {
        return res.status(400).json({ error: 'Bulk review requires a status' });
      }
      const report = await coreStore.reviewModerationReport({
        reportId,
        status: input.status,
        reviewedByUserId: req.userId!,
        reviewedAt: getDbTimestamp(),
        resolutionNote: input.resolutionNote,
      });
      if (report) {
        updatedReports.push(await buildModerationReport(report));
      }
      continue;
    }
    if (!input.escalationReason) {
      return res.status(400).json({ error: 'Bulk escalation requires a reason' });
    }
    const report = await coreStore.escalateModerationReport({
      reportId,
      escalationReason: input.escalationReason,
      escalatedAt: getDbTimestamp(),
      actorUserId: req.userId!,
    });
    if (report) {
      updatedReports.push(await buildModerationReport(report));
    }
  }

  if (input.action === 'escalate' && input.escalationReason) {
    await emitMonitoringEvent({
      type: 'moderation_bulk_escalation',
      severity: 'warning',
      timestamp: new Date().toISOString(),
      payload: {
        reportIds: input.reportIds,
        actorUserId: req.userId,
        escalationReason: input.escalationReason,
      },
    });
  }

  res.json({ reports: updatedReports });
});

app.post('/api/admin/moderation/reports/:reportId/review', requireAuth, requireAdmin, requireCsrf, moderationRateLimiter, async (req: AuthenticatedRequest, res) => {
  const input = parseOrThrow(reviewModerationReportSchema, req.body);
  const report = await coreStore.reviewModerationReport({
    reportId: req.params.reportId,
    status: input.status,
    reviewedByUserId: req.userId!,
    reviewedAt: getDbTimestamp(),
    resolutionNote: input.resolutionNote,
  });
  if (!report) {
    return res.status(404).json({ error: 'Moderation report not found' });
  }
  await notifyUser({
    userId: report.reporter_user_id,
    type: 'moderation',
    title: 'Moderation report updated',
    description: `Your report is now marked ${input.status}.`,
    createdAt: getDbTimestamp(),
    actionUrl: `/notifications/system`,
    emailOverride: true,
    pushOverride: true,
  });
  res.json({ report: await buildModerationReport(report) });
});

app.post('/api/auth/passkeys/register/options', requireAuth, requireCsrf, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await coreStore.findUserById(req.userId!);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const options = await generateRegistrationOptions({
      rpName: 'Preprint Explorer',
      rpID: webAuthnRpID,
      userName: user.email,
      userID: new Uint8Array(Buffer.from(user.id, 'utf8')),
      userDisplayName: user.name,
      excludeCredentials: (await getPasskeys(req.userId!)).map(passkey => ({
        id: passkey.id,
        transports: parseTransports(passkey.transports_json) as ('ble' | 'cable' | 'hybrid' | 'internal' | 'nfc' | 'smart-card' | 'usb')[],
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
      preferredAuthenticatorType: 'localDevice',
    });
    const challenge = await authStore.createWebAuthnChallenge(req.userId!, options.challenge, 'registration');
    res.status(201).json({
      challengeId: challenge.id,
      options,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to start passkey registration' });
  }
});

app.post('/api/auth/passkeys/register/verify', requireAuth, requireCsrf, async (req: AuthenticatedRequest, res) => {
  try {
    const { challengeId, response, label } = req.body as {
      challengeId?: string;
      response?: RegistrationResponseJSON;
      label?: string;
    };
    if (!challengeId || !response) {
      return res.status(400).json({ error: 'Passkey registration challenge and response are required' });
    }
    const challenge = await authStore.consumeWebAuthnChallenge(challengeId, 'registration');
    if (!challenge || challenge.user_id !== req.userId) {
      return res.status(400).json({ error: 'Invalid or expired passkey registration challenge' });
    }

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: webAuthnOrigin,
      expectedRPID: webAuthnRpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ error: 'Passkey registration could not be verified' });
    }

    const credential = verification.registrationInfo.credential;
    const transports = response.response.transports ?? [];
    await securityStore.upsertPasskey({
      id: credential.id,
      userId: req.userId!,
      label: label?.trim() || getClientContext(req).deviceLabel,
      publicKeyB64: Buffer.from(credential.publicKey).toString('base64url'),
      counter: credential.counter,
      deviceType: verification.registrationInfo.credentialDeviceType,
      backedUp: verification.registrationInfo.credentialBackedUp,
      transportsJson: JSON.stringify(transports),
    });
    await securityStore.createSecurityEvent(req.userId!, 'device', 'Passkey registered', {
      deviceLabel: getClientContext(req).deviceLabel,
      locationLabel: getClientContext(req).locationLabel,
    });
    res.status(201).json({
      passkeys: (await getPasskeys(req.userId!)).map(buildPasskey),
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Unable to verify passkey registration' });
  }
});

app.delete('/api/auth/passkeys/:passkeyId', requireAuth, requireCsrf, async (req: AuthenticatedRequest, res) => {
  const { currentPassword } = req.body as { currentPassword?: string };
  if (!hasRecentAuth(req)) {
    if (!currentPassword) {
      return res.status(403).json({ error: 'Recent authentication required' });
    }
    const user = await coreStore.findUserById(req.userId!);
    if (!user || !verifyUserPassword(currentPassword, user.password_hash)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    await authStore.markSessionRecentlyAuthenticated(req.sessionToken!);
  }
  const existing = await securityStore.findPasskeyByIdAndUserId(req.params.passkeyId, req.userId!);
  if (!existing) {
    return res.status(404).json({ error: 'Passkey not found' });
  }
  if (await wouldLeaveAccountWithoutRecovery(req.userId!, { removePasskeyCount: 1 })) {
    return res.status(409).json({
      error: 'Removing this passkey would leave this account without a verified email or two-factor protection. Verify your email or enable 2FA first.',
    });
  }
  await securityStore.deletePasskey(req.params.passkeyId, req.userId!);
  await securityStore.createSecurityEvent(req.userId!, 'device', 'Passkey removed', {
    deviceLabel: getClientContext(req).deviceLabel,
    locationLabel: getClientContext(req).locationLabel,
    isAlert: true,
  });
  res.status(204).send();
});

app.post('/api/auth/passkeys/authenticate/options', authRateLimiter, async (req, res) => {
  try {
    const { email } = req.body as { email?: string };
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const user = await coreStore.findUserByEmail(email.toLowerCase());
    if (!user) {
      return res.status(404).json({ error: 'No account found for that email' });
    }
    const passkeys = await getPasskeys(user.id);
    if (passkeys.length === 0) {
      return res.status(400).json({ error: 'No passkeys registered for that account' });
    }
    const options = await generateAuthenticationOptions({
      rpID: webAuthnRpID,
      allowCredentials: passkeys.map(passkey => ({
        id: passkey.id,
        transports: parseTransports(passkey.transports_json) as ('ble' | 'cable' | 'hybrid' | 'internal' | 'nfc' | 'smart-card' | 'usb')[],
      })),
      userVerification: 'preferred',
    });
    const challenge = await authStore.createWebAuthnChallenge(user.id, options.challenge, 'authentication');
    res.status(201).json({
      challengeId: challenge.id,
      options,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Unable to start passkey sign-in' });
  }
});

app.post('/api/auth/passkeys/authenticate/verify', authRateLimiter, async (req, res) => {
  try {
    const { challengeId, response } = req.body as {
      challengeId?: string;
      response?: AuthenticationResponseJSON;
    };
    if (!challengeId || !response) {
      return res.status(400).json({ error: 'Passkey authentication challenge and response are required' });
    }
    const challenge = await authStore.consumeWebAuthnChallenge(challengeId, 'authentication');
    if (!challenge) {
      return res.status(400).json({ error: 'Invalid or expired passkey authentication challenge' });
    }
    const verification = await verifyPasskeyAssertion(challenge.user_id, challenge.challenge, response);
    if (!verification.passkey) {
      return res.status(404).json({ error: 'Passkey not found for this account' });
    }
    if (!verification.verified) {
      return res.status(401).json({ error: 'Passkey authentication failed' });
    }

    const client = getClientContext(req);
    const session = await authStore.createSession(challenge.user_id, client);
    await securityStore.createSecurityEvent(challenge.user_id, 'login', 'Signed in with passkey', {
      deviceLabel: client.deviceLabel,
      locationLabel: client.locationLabel,
    });
    setSessionCookie(res, session.token);
    res.json(await authResponse(challenge.user_id, session.csrfToken));
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: 'Unable to verify passkey sign-in' });
  }
});

app.get('/api/settings', requireAuth, async (req: AuthenticatedRequest, res) => {
  res.json(await getSettings(req.userId!));
});

app.patch('/api/settings', requireAuth, requireCsrf, async (req: AuthenticatedRequest, res) => {
  const input = parseOrThrow(settingsSchema, req.body);
  const previousSettings = await getSettings(req.userId!);
  const settings = { ...previousSettings, ...input };
  if (!settings.emailEnabled) {
    settings.dailyDigest = false;
    settings.weeklyDigest = false;
  }
  await coreStore.updateSettings(req.userId!, settings);
  if (!previousSettings.productUpdates && settings.productUpdates) {
    await notifyUser({
      userId: req.userId!,
      type: 'product',
      title: 'Product updates enabled',
      description: 'You will now receive updates about new features, improvements, and research tools.',
      createdAt: getDbTimestamp(),
      actionUrl: '/notification-settings',
      emailOverride: false,
      pushOverride: false,
    });
  }
  res.json(await getSettings(req.userId!));
});

app.post('/api/digests/send-now', requireAuth, requireCsrf, async (req: AuthenticatedRequest, res) => {
  const { kind } = parseOrThrow(digestSendSchema, req.body);
  const result = await sendDigestNow(req.userId!, kind);
  res.status(201).json({
    kind,
    recipient: result.recipient,
    subject: result.subject,
    paperCount: result.paperCount,
    delivery: result.delivery,
  });
});

app.get('/api/push/public-key', requireAuth, async (_req: AuthenticatedRequest, res) => {
  res.json({ publicKey: getPushPublicKey() });
});

app.post('/api/push/subscribe', requireAuth, requireCsrf, async (req: AuthenticatedRequest, res) => {
  const subscription = parseOrThrow(pushSubscriptionSchema, req.body);
  await coreStore.upsertPushSubscription({
    userId: req.userId!,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  });
  res.status(201).json({ ok: true });
});

app.delete('/api/push/subscribe', requireAuth, requireCsrf, async (req: AuthenticatedRequest, res) => {
  const subscription = parseOrThrow(pushSubscriptionSchema, req.body);
  await coreStore.deletePushSubscription(req.userId!, subscription.endpoint);
  res.status(204).send();
});

app.patch('/api/profile', requireAuth, requireCsrf, async (req: AuthenticatedRequest, res) => {
  const { name, email, orcidId, affiliation, bio, title, imageUrl, isAffiliationVerified, currentPassword } = parseOrThrow(updateProfileSchema, req.body);
  const existingUser = await coreStore.findUserById(req.userId!);
  const emailChanged = Boolean(existingUser && email.toLowerCase() !== existingUser.email.toLowerCase());
  const affiliationChanged = Boolean(existingUser && affiliation.trim().toLowerCase() !== existingUser.affiliation.trim().toLowerCase());
  if (emailChanged) {
    if (!hasRecentAuth(req)) {
      if (!currentPassword) {
        return res.status(403).json({ error: 'Recent authentication required' });
      }
      if (!verifyUserPassword(currentPassword, existingUser!.password_hash)) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      await authStore.markSessionRecentlyAuthenticated(req.sessionToken!);
    }
  }
  await coreStore.updateUserProfile({
    userId: req.userId!,
    name,
    email,
    orcidId: orcidId?.trim() || null,
    affiliation,
    bio,
    title,
    imageUrl,
    isEmailVerified: emailChanged ? false : Boolean(existingUser?.is_email_verified ?? 0),
    isAffiliationVerified: affiliationChanged ? false : Boolean(isAffiliationVerified ?? existingUser?.is_affiliation_verified ?? 0),
  });
  const user = await coreStore.findUserById(req.userId!) as UserRow;
  res.json({ user: await buildUser(user, req.userId), social: await getSocialBootstrap(req.userId!) });
});

app.get('/api/social/bootstrap', requireAuth, async (req: AuthenticatedRequest, res) => {
  res.json(await getSocialBootstrap(req.userId!));
});

app.post('/api/social/follow/:userId', requireAuth, requireCsrf, async (req: AuthenticatedRequest, res) => {
  const targetUserId = req.params.userId;
  if (targetUserId === req.userId) {
    return res.status(400).json({ error: 'You cannot follow yourself' });
  }
  if (!await assertNotBlocked(req.userId!, targetUserId)) {
    return res.status(403).json({ error: 'This follow action is not allowed.' });
  }
  await coreStore.createFollow(req.userId!, targetUserId, getDbTimestamp());
  const actor = await coreStore.findUserById(req.userId!);
  await notifyUser({
    userId: targetUserId,
    type: 'collab',
    title: 'New follower',
    description: `${actor?.name ?? 'A researcher'} started following your profile.`,
    createdAt: getDbTimestamp(),
    actorUserId: req.userId!,
    actionUrl: `/profile/${req.userId!}`,
    emailOverride: true,
    pushOverride: true,
  });
  broadcastLiveEvent([req.userId!, targetUserId], { type: 'social-updated' });
  res.json(await getSocialBootstrap(req.userId!));
});

app.delete('/api/social/follow/:userId', requireAuth, requireCsrf, async (req: AuthenticatedRequest, res) => {
  await coreStore.deleteFollow(req.userId!, req.params.userId);
  broadcastLiveEvent([req.userId!, req.params.userId], { type: 'social-updated' });
  res.json(await getSocialBootstrap(req.userId!));
});

app.get('/api/social/profile/:userId/connections', requireAuth, async (req: AuthenticatedRequest, res) => {
  const targetUserId = req.params.userId;
  const targetUser = await coreStore.findUserById(targetUserId);
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (targetUserId !== req.userId && !await canViewProfile(req.userId!, targetUserId)) {
    return res.status(403).json({ error: 'This profile is not available to you.' });
  }

  const [followerIds, followingIds] = await Promise.all([
    coreStore.listFollowerIdsByUserId(targetUserId),
    coreStore.listFollowingIdsByUserId(targetUserId),
  ]);

  const followers = await Promise.all(followerIds.map(async (userId) => {
    const follower = await coreStore.findUserById(userId);
    if (!follower) {
      return null;
    }
    if (userId !== req.userId && !await canViewProfile(req.userId!, userId)) {
      return null;
    }
    return buildUser(follower, req.userId);
  }));

  const following = await Promise.all(followingIds.map(async (userId) => {
    const followedUser = await coreStore.findUserById(userId);
    if (!followedUser) {
      return null;
    }
    if (userId !== req.userId && !await canViewProfile(req.userId!, userId)) {
      return null;
    }
    return buildUser(followedUser, req.userId);
  }));

  res.json({
    followers: followers.filter((user): user is Awaited<ReturnType<typeof buildUser>> => Boolean(user)),
    following: following.filter((user): user is Awaited<ReturnType<typeof buildUser>> => Boolean(user)),
  });
});

app.post('/api/social/share', requireAuth, requireCsrf, async (req: AuthenticatedRequest, res) => {
  const { preprintId, recipientIds } = parseOrThrow(shareSchema, req.body);
  for (const recipientId of recipientIds) {
    const allowed = await assertPrivacyAccess(req.userId!, recipientId, 'sharePrivacy');
    if (!allowed) {
      return res.status(403).json({ error: 'One or more recipients do not accept direct paper shares from you.' });
    }
  }
  await coreStore.createPreprintShares(req.userId!, preprintId, recipientIds, getDbTimestamp());
  const actor = await coreStore.findUserById(req.userId!);
  for (const recipientId of recipientIds) {
    await notifyUser({
      userId: recipientId,
      type: 'share',
      title: 'Paper shared with you',
      description: `${actor?.name ?? 'A researcher'} shared a paper with you.`,
      createdAt: getDbTimestamp(),
      actorUserId: req.userId!,
      actionUrl: `/share/${preprintId}`,
      emailOverride: true,
      pushOverride: true,
    });
  }
  broadcastLiveEvent([req.userId!, ...recipientIds], { type: 'social-updated' });
  res.status(201).json({ shared: recipientIds.length });
});

app.post('/api/chats', requireAuth, requireCsrf, async (req: AuthenticatedRequest, res) => {
  const { participantId } = parseOrThrow(createChatSchema, req.body);
  if (!await assertNotBlocked(req.userId!, participantId)) {
    return res.status(403).json({ error: 'This conversation is not allowed.' });
  }
  const allowed = await assertPrivacyAccess(req.userId!, participantId, 'messagePrivacy');
  if (!allowed) {
    return res.status(403).json({ error: 'This user does not accept direct messages from you.' });
  }

  const existingChatId = await coreStore.findDirectChatId(req.userId!, participantId);
  const chatId = existingChatId ?? await coreStore.createChat(getDbTimestamp());
  if (!existingChatId) {
    await coreStore.addChatParticipant(chatId, req.userId!);
    await coreStore.addChatParticipant(chatId, participantId);
  }

  broadcastLiveEvent([req.userId!, participantId], { type: 'chat-updated', chatId: String(chatId) });
  res.status(201).json({ chat: await buildChat(chatId, req.userId!) });
});

app.post('/api/chats/:chatId/messages', requireAuth, requireCsrf, async (req: AuthenticatedRequest, res) => {
  const { text } = parseOrThrow(chatMessageSchema, req.body);
  const chatId = Number(req.params.chatId);

  const participant = await coreStore.isChatParticipant(chatId, req.userId!);
  if (!participant) {
    return res.status(403).json({ error: 'Not a chat participant' });
  }

  const recipients = await coreStore.listChatParticipantIds(chatId);
  for (const recipientId of recipients.filter((recipientId) => recipientId !== req.userId)) {
    if (!await assertNotBlocked(req.userId!, recipientId)) {
      return res.status(403).json({ error: 'A participant has blocked this interaction.' });
    }
  }
  await coreStore.createMessage(chatId, req.userId!, text.trim(), getDbTimestamp());
  const actor = await coreStore.findUserById(req.userId!);
  for (const recipientId of recipients.filter((recipientId) => recipientId !== req.userId)) {
    await notifyUser({
      userId: recipientId,
      type: 'message',
      title: 'New direct message',
      description: `${actor?.name ?? 'A researcher'} sent you a new message.`,
      createdAt: getDbTimestamp(),
      actorUserId: req.userId!,
      actionUrl: `/chat/${chatId}`,
      emailOverride: true,
      pushOverride: true,
    });
  }
  broadcastLiveEvent(recipients, { type: 'chat-updated', chatId: String(chatId) });
  res.status(201).json({ chat: await buildChat(chatId, req.userId!) });
});

app.post('/api/chats/:chatId/mark-read', requireAuth, requireCsrf, async (req: AuthenticatedRequest, res) => {
  const chatId = Number(req.params.chatId);
  const participant = await coreStore.isChatParticipant(chatId, req.userId!);
  if (!participant) {
    return res.status(403).json({ error: 'Not a chat participant' });
  }

  await coreStore.markNotificationsReadByActionUrl(req.userId!, `/chat/${chatId}`);
  sendLiveEvent(req.userId!, { type: 'notifications-updated' });
  res.json({ chat: await buildChat(chatId, req.userId!) });
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

if (isProduction) {
  const distPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
  app.use(express.static(distPath));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
  if (error.name === 'ValidationError') {
    return res.status(400).json({ error: error.message });
  }
  console.error(JSON.stringify({
    type: 'server_error',
    requestId: (req as AuthenticatedRequest).requestId,
    path: req.originalUrl,
    method: req.method,
    message: error.message,
    stack: error.stack,
  }));
  void emitMonitoringEvent({
    type: 'server_error',
    severity: 'error',
    timestamp: new Date().toISOString(),
    payload: {
      requestId: (req as AuthenticatedRequest).requestId,
      path: req.originalUrl,
      method: req.method,
      message: error.message,
    },
  });
  res.status(500).json({ error: 'Internal server error', requestId: (req as AuthenticatedRequest).requestId });
});

if (migrateOnly) {
  console.log(`Database migrations applied at ${getDatabasePath()}`);
} else {
  void runDueContentSyncs().catch((error) => {
    console.warn(JSON.stringify({
      type: 'content_sync_bootstrap_failed',
      error: error instanceof Error ? error.message : String(error),
    }));
  });
  void runDueDigests().catch((error) => {
    console.warn(JSON.stringify({
      type: 'digest_bootstrap_failed',
      error: error instanceof Error ? error.message : String(error),
    }));
  });
  contentSyncInterval = setInterval(() => {
    void runDueContentSyncs().catch((error) => {
      console.warn(JSON.stringify({
        type: 'content_sync_interval_failed',
        error: error instanceof Error ? error.message : String(error),
      }));
    });
  }, 60_000);
  digestInterval = setInterval(() => {
    void runDueDigests().catch((error) => {
      console.warn(JSON.stringify({
        type: 'digest_interval_failed',
        error: error instanceof Error ? error.message : String(error),
      }));
    });
  }, Number(process.env.DIGEST_INTERVAL_MS ?? 300_000));
  httpServer = app.listen(port, () => {
    console.log(`Preprint Explorer API listening on http://localhost:${port}`);
  });
}
