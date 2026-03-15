import crypto from 'node:crypto';
import { Pool } from 'pg';
import { db } from './db';

export type StoredUser = {
  id: string;
  name: string;
  email: string;
  is_admin: number;
  affiliation: string;
  institution_id: string | null;
  image_url: string;
  bio: string;
  title: string;
  is_email_verified: number;
  is_affiliation_verified: number;
  created_at: string;
  password_hash?: string;
};

export type StoredSettings = {
  push_enabled: number;
  email_enabled: number;
  daily_digest: number;
  weekly_digest: number;
  new_publications: number;
  citation_alerts: number;
  product_updates: number;
  delivery_day: string;
  profile_visibility: 'public' | 'followers' | 'private';
  message_privacy: 'everyone' | 'followers' | 'nobody';
  share_privacy: 'everyone' | 'followers' | 'nobody';
};

export type StoredChatMessage = {
  id: number;
  sender_id: string;
  text: string;
  created_at: string;
};

export type StoredNotification = {
  id: string;
  user_id: string;
  type: 'feed' | 'citation' | 'collab' | 'share' | 'comment';
  title: string;
  description: string;
  created_at: string;
  read_at: string | null;
  action_url: string | null;
  actor_user_id: string | null;
};

export type StoredSavedSearch = {
  id: string;
  user_id: string;
  label: string;
  query_text: string;
  filters_json: string;
  created_at: string;
  updated_at: string;
};

export type StoredPopularSearch = {
  normalized_query: string;
  display_query: string;
  search_count: number;
  last_result_count: number;
  last_user_id: string | null;
  last_searched_at: string;
};

export type StoredModerationReport = {
  id: string;
  reporter_user_id: string;
  target_type: 'user' | 'preprint' | 'chat' | 'message' | 'comment';
  target_id: string;
  reason: 'spam' | 'harassment' | 'misinformation' | 'copyright' | 'other';
  details: string | null;
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
  created_at: string;
  updated_at: string;
  assigned_to_user_id: string | null;
  escalated_at: string | null;
  escalation_reason: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  resolution_note: string | null;
};

export type StoredModerationAction = {
  id: string;
  report_id: string;
  actor_user_id: string;
  action_type: 'reported' | 'assigned' | 'reviewing' | 'resolved' | 'dismissed' | 'escalated';
  action_note: string | null;
  created_at: string;
};

type CoreStore = {
  kind: 'sqlite' | 'postgres';
  init: () => Promise<void>;
  ping: () => Promise<void>;
  close: () => Promise<void>;
  findUserById: (id: string) => Promise<StoredUser | undefined>;
  findUserByEmail: (email: string) => Promise<StoredUser | undefined>;
  listUsers: () => Promise<StoredUser[]>;
  createUser: (input: {
    id: string;
    name: string;
    email: string;
    passwordHash: string;
    affiliation: string;
    institutionId?: string | null;
    imageUrl: string;
    bio: string;
    title: string;
    isEmailVerified: boolean;
    isAffiliationVerified: boolean;
    isAdmin?: boolean;
  }) => Promise<void>;
  setUserAdminByEmail: (email: string, isAdmin: boolean) => Promise<void>;
  updateUserPassword: (userId: string, passwordHash: string) => Promise<void>;
  markEmailVerified: (userId: string) => Promise<void>;
  updateUserProfile: (input: {
    userId: string;
    name: string;
    email: string;
    affiliation: string;
    bio: string;
    title: string;
    imageUrl: string;
    isEmailVerified: boolean;
    isAffiliationVerified: boolean;
  }) => Promise<void>;
  ensureDefaultSettings: (userId: string) => Promise<void>;
  findSettingsByUserId: (userId: string) => Promise<StoredSettings | undefined>;
  updateSettings: (userId: string, settings: {
    pushEnabled: boolean;
    emailEnabled: boolean;
    dailyDigest: boolean;
    weeklyDigest: boolean;
    newPublications: boolean;
    citationAlerts: boolean;
    productUpdates: boolean;
    deliveryDay: string;
    profileVisibility: 'public' | 'followers' | 'private';
    messagePrivacy: 'everyone' | 'followers' | 'nobody';
    sharePrivacy: 'everyone' | 'followers' | 'nobody';
  }) => Promise<void>;
  getFollowerCounts: () => Promise<Map<string, number>>;
  getFollowingCounts: () => Promise<Map<string, number>>;
  isFollowing: (viewerId: string, targetUserId: string) => Promise<boolean>;
  createFollow: (followerId: string, followingId: string, createdAt: string) => Promise<void>;
  deleteFollow: (followerId: string, followingId: string) => Promise<void>;
  findDirectChatId: (userId: string, participantId: string) => Promise<number | undefined>;
  createChat: (createdAt: string) => Promise<number>;
  addChatParticipant: (chatId: number, userId: string) => Promise<void>;
  listUserChatIds: (userId: string) => Promise<number[]>;
  listChatParticipantIds: (chatId: number) => Promise<string[]>;
  listChatMessages: (chatId: number) => Promise<StoredChatMessage[]>;
  isChatParticipant: (chatId: number, userId: string) => Promise<boolean>;
  createMessage: (chatId: number, senderId: string, text: string, createdAt: string) => Promise<void>;
  createPreprintShares: (senderId: string, preprintId: string, recipientIds: string[], createdAt: string) => Promise<void>;
  listNotificationsByUserId: (userId: string, limit?: number) => Promise<StoredNotification[]>;
  createNotification: (input: {
    userId: string;
    type: 'feed' | 'citation' | 'collab' | 'share' | 'comment';
    title: string;
    description: string;
    createdAt: string;
    actorUserId?: string | null;
    actionUrl?: string | null;
  }) => Promise<void>;
  markNotificationsRead: (userId: string) => Promise<void>;
  markNotificationRead: (userId: string, notificationId: string) => Promise<void>;
  countUnreadNotificationsByActionUrl: (userId: string, actionUrl: string) => Promise<number>;
  markNotificationsReadByActionUrl: (userId: string, actionUrl: string) => Promise<void>;
  listSavedSearchesByUserId: (userId: string) => Promise<StoredSavedSearch[]>;
  upsertSavedSearch: (input: {
    userId: string;
    label: string;
    queryText: string;
    filtersJson: string;
    savedAt: string;
  }) => Promise<StoredSavedSearch>;
  deleteSavedSearch: (userId: string, savedSearchId: string) => Promise<void>;
  recordSearchAnalytics: (input: {
    userId?: string | null;
    queryText: string;
    normalizedQuery: string;
    resultCount: number;
    searchedAt: string;
  }) => Promise<void>;
  listPopularSearches: (limit: number, prefix?: string) => Promise<StoredPopularSearch[]>;
  createModerationReport: (input: {
    reporterUserId: string;
    targetType: 'user' | 'preprint' | 'chat' | 'message' | 'comment';
    targetId: string;
    reason: 'spam' | 'harassment' | 'misinformation' | 'copyright' | 'other';
    details?: string | null;
    createdAt: string;
  }) => Promise<StoredModerationReport>;
  listModerationReports: (statuses?: Array<'open' | 'reviewing' | 'resolved' | 'dismissed'>) => Promise<StoredModerationReport[]>;
  assignModerationReport: (reportId: string, assignedToUserId: string | null, assignedAt: string, actorUserId: string) => Promise<StoredModerationReport | undefined>;
  escalateModerationReport: (input: {
    reportId: string;
    escalationReason: string;
    escalatedAt: string;
    actorUserId: string;
  }) => Promise<StoredModerationReport | undefined>;
  reviewModerationReport: (input: {
    reportId: string;
    status: 'reviewing' | 'resolved' | 'dismissed';
    reviewedByUserId: string;
    reviewedAt: string;
    resolutionNote?: string | null;
  }) => Promise<StoredModerationReport | undefined>;
  listModerationActionsByReportId: (reportId: string) => Promise<StoredModerationAction[]>;
  createBlockedUser: (blockerUserId: string, blockedUserId: string, createdAt: string) => Promise<void>;
  deleteBlockedUser: (blockerUserId: string, blockedUserId: string) => Promise<void>;
  listBlockedUserIds: (blockerUserId: string) => Promise<string[]>;
  isBlockedBetween: (userA: string, userB: string) => Promise<boolean>;
};

function now() {
  return new Date().toISOString();
}

function toInt(value: number | string) {
  return typeof value === 'number' ? value : Number(value);
}

function createSqliteStore(): CoreStore {
  return {
    kind: 'sqlite',
    init: async () => {},
    ping: async () => {
      db.prepare('SELECT 1').get();
    },
    close: async () => {},

    async findUserById(id: string) {
      return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as StoredUser | undefined;
    },

    async findUserByEmail(email: string) {
      return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as StoredUser | undefined;
    },

    async listUsers() {
      return db.prepare('SELECT * FROM users ORDER BY name ASC').all() as StoredUser[];
    },

    async createUser(input) {
      db.prepare(`
        INSERT INTO users (
          id, name, email, password_hash, affiliation, institution_id, image_url, bio, title,
          is_email_verified, is_affiliation_verified, is_admin, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        input.id,
        input.name,
        input.email,
        input.passwordHash,
        input.affiliation,
        input.institutionId ?? null,
        input.imageUrl,
        input.bio,
        input.title,
        input.isEmailVerified ? 1 : 0,
        input.isAffiliationVerified ? 1 : 0,
        input.isAdmin ? 1 : 0,
        now(),
      );
    },

    async setUserAdminByEmail(email: string, isAdmin: boolean) {
      db.prepare('UPDATE users SET is_admin = ? WHERE lower(email) = lower(?)').run(isAdmin ? 1 : 0, email);
    },

    async updateUserPassword(userId: string, passwordHash: string) {
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, userId);
    },

    async markEmailVerified(userId: string) {
      db.prepare('UPDATE users SET is_email_verified = 1 WHERE id = ?').run(userId);
    },

    async updateUserProfile(input) {
      db.prepare(`
        UPDATE users
        SET name = ?, email = ?, affiliation = ?, bio = ?, title = ?, image_url = ?, is_email_verified = ?, is_affiliation_verified = ?
        WHERE id = ?
      `).run(
        input.name,
        input.email,
        input.affiliation,
        input.bio,
        input.title,
        input.imageUrl,
        input.isEmailVerified ? 1 : 0,
        input.isAffiliationVerified ? 1 : 0,
        input.userId,
      );
    },

    async ensureDefaultSettings(userId: string) {
      db.prepare(`
      INSERT OR IGNORE INTO user_settings (
        user_id, push_enabled, email_enabled, daily_digest, weekly_digest, new_publications,
        citation_alerts, product_updates, delivery_day, profile_visibility, message_privacy, share_privacy
      ) VALUES (?, 1, 1, 1, 1, 1, 1, 0, 'Friday', 'public', 'everyone', 'everyone')
      `).run(userId);
    },

    async findSettingsByUserId(userId: string) {
      return db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId) as StoredSettings | undefined;
    },

    async updateSettings(userId: string, settings) {
      db.prepare(`
        UPDATE user_settings SET
          push_enabled = ?,
          email_enabled = ?,
          daily_digest = ?,
        weekly_digest = ?,
        new_publications = ?,
        citation_alerts = ?,
        product_updates = ?,
        delivery_day = ?,
        profile_visibility = ?,
        message_privacy = ?,
        share_privacy = ?
      WHERE user_id = ?
    `).run(
      settings.pushEnabled ? 1 : 0,
        settings.emailEnabled ? 1 : 0,
        settings.dailyDigest ? 1 : 0,
        settings.weeklyDigest ? 1 : 0,
        settings.newPublications ? 1 : 0,
      settings.citationAlerts ? 1 : 0,
      settings.productUpdates ? 1 : 0,
      settings.deliveryDay,
      settings.profileVisibility,
      settings.messagePrivacy,
      settings.sharePrivacy,
      userId,
    );
  },

    async getFollowerCounts() {
      const rows = db.prepare(`
        SELECT following_id as user_id, COUNT(*) as followers
        FROM follows
        GROUP BY following_id
      `).all() as Array<{ user_id: string; followers: number }>;
      return new Map(rows.map((row) => [row.user_id, row.followers]));
    },

    async getFollowingCounts() {
      const rows = db.prepare(`
        SELECT follower_id as user_id, COUNT(*) as following
        FROM follows
        GROUP BY follower_id
      `).all() as Array<{ user_id: string; following: number }>;
      return new Map(rows.map((row) => [row.user_id, row.following]));
    },

    async isFollowing(viewerId: string, targetUserId: string) {
      return Boolean(
        db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?').get(viewerId, targetUserId),
      );
    },

    async createFollow(followerId: string, followingId: string, createdAt: string) {
      db.prepare('INSERT OR IGNORE INTO follows (follower_id, following_id, created_at) VALUES (?, ?, ?)')
        .run(followerId, followingId, createdAt);
    },

    async deleteFollow(followerId: string, followingId: string) {
      db.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?').run(followerId, followingId);
    },

    async findDirectChatId(userId: string, participantId: string) {
      const row = db.prepare(`
        SELECT cp1.chat_id as chat_id
        FROM chat_participants cp1
        JOIN chat_participants cp2 ON cp1.chat_id = cp2.chat_id
        WHERE cp1.user_id = ? AND cp2.user_id = ?
      `).get(userId, participantId) as { chat_id: number } | undefined;
      return row?.chat_id;
    },

    async createChat(createdAt: string) {
      const result = db.prepare('INSERT INTO chats (created_at) VALUES (?)').run(createdAt);
      return Number(result.lastInsertRowid);
    },

    async addChatParticipant(chatId: number, userId: string) {
      db.prepare('INSERT INTO chat_participants (chat_id, user_id) VALUES (?, ?)').run(chatId, userId);
    },

    async listUserChatIds(userId: string) {
      const rows = db.prepare(`
        SELECT DISTINCT c.id
        FROM chats c
        JOIN chat_participants cp ON cp.chat_id = c.id
        LEFT JOIN messages m ON m.chat_id = c.id
        WHERE cp.user_id = ?
        GROUP BY c.id, c.created_at
        ORDER BY COALESCE(MAX(m.created_at), c.created_at) DESC, c.id DESC
      `).all(userId) as Array<{ id: number }>;
      return rows.map((row) => row.id);
    },

    async listChatParticipantIds(chatId: number) {
      const rows = db.prepare('SELECT user_id FROM chat_participants WHERE chat_id = ?').all(chatId) as Array<{ user_id: string }>;
      return rows.map((row) => row.user_id);
    },

    async listChatMessages(chatId: number) {
      return db.prepare(`
        SELECT id, sender_id, text, created_at
        FROM messages
        WHERE chat_id = ?
        ORDER BY created_at ASC
      `).all(chatId) as StoredChatMessage[];
    },

    async isChatParticipant(chatId: number, userId: string) {
      return Boolean(db.prepare('SELECT 1 FROM chat_participants WHERE chat_id = ? AND user_id = ?').get(chatId, userId));
    },

    async createMessage(chatId: number, senderId: string, text: string, createdAt: string) {
      db.prepare('INSERT INTO messages (chat_id, sender_id, text, created_at) VALUES (?, ?, ?, ?)')
        .run(chatId, senderId, text, createdAt);
    },

    async createPreprintShares(senderId: string, preprintId: string, recipientIds: string[], createdAt: string) {
      const insert = db.prepare('INSERT INTO preprint_shares (preprint_id, sender_id, recipient_id, created_at) VALUES (?, ?, ?, ?)');
      recipientIds.forEach((recipientId) => insert.run(preprintId, senderId, recipientId, createdAt));
    },

    async listNotificationsByUserId(userId: string, limit = 50) {
      return db.prepare(`
        SELECT id, user_id, type, title, description, created_at, read_at, action_url, actor_user_id
        FROM notifications
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `).all(userId, limit) as StoredNotification[];
    },

    async createNotification(input) {
      db.prepare(`
        INSERT INTO notifications (
          id, user_id, type, title, description, created_at, read_at, action_url, actor_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)
      `).run(
        crypto.randomUUID(),
        input.userId,
        input.type,
        input.title,
        input.description,
        input.createdAt,
        input.actionUrl ?? null,
        input.actorUserId ?? null,
      );
    },

    async markNotificationsRead(userId: string) {
      db.prepare('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL').run(now(), userId);
    },

    async markNotificationRead(userId: string, notificationId: string) {
      db.prepare('UPDATE notifications SET read_at = ? WHERE user_id = ? AND id = ? AND read_at IS NULL').run(now(), userId, notificationId);
    },

    async countUnreadNotificationsByActionUrl(userId: string, actionUrl: string) {
      const row = db.prepare(`
        SELECT COUNT(*) as count
        FROM notifications
        WHERE user_id = ? AND action_url = ? AND read_at IS NULL
      `).get(userId, actionUrl) as { count: number } | undefined;
      return Number(row?.count ?? 0);
    },

    async markNotificationsReadByActionUrl(userId: string, actionUrl: string) {
      db.prepare(`
        UPDATE notifications
        SET read_at = ?
        WHERE user_id = ? AND action_url = ? AND read_at IS NULL
      `).run(now(), userId, actionUrl);
    },

    async listSavedSearchesByUserId(userId: string) {
      return db.prepare(`
        SELECT id, user_id, label, query_text, filters_json, created_at, updated_at
        FROM saved_searches
        WHERE user_id = ?
        ORDER BY updated_at DESC
      `).all(userId) as StoredSavedSearch[];
    },

    async upsertSavedSearch(input) {
      const existing = db.prepare(`
        SELECT id
        FROM saved_searches
        WHERE user_id = ? AND label = ?
      `).get(input.userId, input.label) as { id: string } | undefined;
      if (existing) {
        db.prepare(`
          UPDATE saved_searches
          SET query_text = ?, filters_json = ?, updated_at = ?
          WHERE id = ?
        `).run(input.queryText, input.filtersJson, input.savedAt, existing.id);
        return db.prepare('SELECT * FROM saved_searches WHERE id = ?').get(existing.id) as StoredSavedSearch;
      }
      const savedSearch = {
        id: crypto.randomUUID(),
        user_id: input.userId,
        label: input.label,
        query_text: input.queryText,
        filters_json: input.filtersJson,
        created_at: input.savedAt,
        updated_at: input.savedAt,
      };
      db.prepare(`
        INSERT INTO saved_searches (id, user_id, label, query_text, filters_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        savedSearch.id,
        savedSearch.user_id,
        savedSearch.label,
        savedSearch.query_text,
        savedSearch.filters_json,
        savedSearch.created_at,
        savedSearch.updated_at,
      );
      return savedSearch;
    },

    async deleteSavedSearch(userId: string, savedSearchId: string) {
      db.prepare('DELETE FROM saved_searches WHERE id = ? AND user_id = ?').run(savedSearchId, userId);
    },

    async recordSearchAnalytics(input) {
      db.prepare(`
        INSERT INTO search_analytics (
          normalized_query, display_query, search_count, last_result_count, last_user_id, last_searched_at
        ) VALUES (?, ?, 1, ?, ?, ?)
        ON CONFLICT(normalized_query) DO UPDATE SET
          display_query = excluded.display_query,
          search_count = search_analytics.search_count + 1,
          last_result_count = excluded.last_result_count,
          last_user_id = excluded.last_user_id,
          last_searched_at = excluded.last_searched_at
      `).run(
        input.normalizedQuery,
        input.queryText,
        input.resultCount,
        input.userId ?? null,
        input.searchedAt,
      );
    },

    async listPopularSearches(limit: number, prefix?: string) {
      if (prefix?.trim()) {
        return db.prepare(`
          SELECT normalized_query, display_query, search_count, last_result_count, last_user_id, last_searched_at
          FROM search_analytics
          WHERE normalized_query LIKE ?
          ORDER BY search_count DESC, last_searched_at DESC
          LIMIT ?
        `).all(`${prefix.trim().toLowerCase()}%`, limit) as StoredPopularSearch[];
      }
      return db.prepare(`
        SELECT normalized_query, display_query, search_count, last_result_count, last_user_id, last_searched_at
        FROM search_analytics
        ORDER BY search_count DESC, last_searched_at DESC
        LIMIT ?
      `).all(limit) as StoredPopularSearch[];
    },

    async createModerationReport(input) {
      const report = {
        id: crypto.randomUUID(),
        reporter_user_id: input.reporterUserId,
        target_type: input.targetType,
        target_id: input.targetId,
        reason: input.reason,
        details: input.details ?? null,
        status: 'open' as const,
        created_at: input.createdAt,
        updated_at: input.createdAt,
        assigned_to_user_id: null,
        escalated_at: null,
        escalation_reason: null,
        reviewed_by_user_id: null,
        reviewed_at: null,
        resolution_note: null,
      };
      db.prepare(`
        INSERT INTO moderation_reports (
          id, reporter_user_id, target_type, target_id, reason, details, status, created_at, updated_at,
          assigned_to_user_id, escalated_at, escalation_reason, reviewed_by_user_id, reviewed_at, resolution_note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        report.id,
        report.reporter_user_id,
        report.target_type,
        report.target_id,
        report.reason,
        report.details,
        report.status,
        report.created_at,
        report.updated_at,
        report.assigned_to_user_id,
        report.escalated_at,
        report.escalation_reason,
        report.reviewed_by_user_id,
        report.reviewed_at,
        report.resolution_note,
      );
      db.prepare(`
        INSERT INTO moderation_actions (id, report_id, actor_user_id, action_type, action_note, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), report.id, input.reporterUserId, 'reported', input.details ?? null, input.createdAt);
      return report;
    },

    async listModerationReports(statuses) {
      if (!statuses || statuses.length === 0) {
        return db.prepare('SELECT * FROM moderation_reports ORDER BY created_at DESC').all() as StoredModerationReport[];
      }
      const placeholders = statuses.map(() => '?').join(', ');
      return db.prepare(`SELECT * FROM moderation_reports WHERE status IN (${placeholders}) ORDER BY created_at DESC`).all(...statuses) as StoredModerationReport[];
    },

    async assignModerationReport(reportId, assignedToUserId, assignedAt, actorUserId) {
      db.prepare(`
        UPDATE moderation_reports
        SET assigned_to_user_id = ?, updated_at = ?
        WHERE id = ?
      `).run(assignedToUserId, assignedAt, reportId);
      db.prepare(`
        INSERT INTO moderation_actions (id, report_id, actor_user_id, action_type, action_note, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), reportId, actorUserId, 'assigned', assignedToUserId, assignedAt);
      return db.prepare('SELECT * FROM moderation_reports WHERE id = ?').get(reportId) as StoredModerationReport | undefined;
    },

    async escalateModerationReport(input) {
      db.prepare(`
        UPDATE moderation_reports
        SET escalated_at = ?, escalation_reason = ?, updated_at = ?
        WHERE id = ?
      `).run(input.escalatedAt, input.escalationReason, input.escalatedAt, input.reportId);
      db.prepare(`
        INSERT INTO moderation_actions (id, report_id, actor_user_id, action_type, action_note, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), input.reportId, input.actorUserId, 'escalated', input.escalationReason, input.escalatedAt);
      return db.prepare('SELECT * FROM moderation_reports WHERE id = ?').get(input.reportId) as StoredModerationReport | undefined;
    },

    async reviewModerationReport(input) {
      db.prepare(`
        UPDATE moderation_reports
        SET status = ?, reviewed_by_user_id = ?, reviewed_at = ?, resolution_note = ?, updated_at = ?
        WHERE id = ?
      `).run(
        input.status,
        input.reviewedByUserId,
        input.reviewedAt,
        input.resolutionNote ?? null,
        input.reviewedAt,
        input.reportId,
      );
      db.prepare(`
        INSERT INTO moderation_actions (id, report_id, actor_user_id, action_type, action_note, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), input.reportId, input.reviewedByUserId, input.status, input.resolutionNote ?? null, input.reviewedAt);
      return db.prepare('SELECT * FROM moderation_reports WHERE id = ?').get(input.reportId) as StoredModerationReport | undefined;
    },

    async listModerationActionsByReportId(reportId) {
      return db.prepare(`
        SELECT id, report_id, actor_user_id, action_type, action_note, created_at
        FROM moderation_actions
        WHERE report_id = ?
        ORDER BY created_at DESC
      `).all(reportId) as StoredModerationAction[];
    },

    async createBlockedUser(blockerUserId: string, blockedUserId: string, createdAt: string) {
      db.prepare(`
        INSERT OR IGNORE INTO blocked_users (blocker_user_id, blocked_user_id, created_at)
        VALUES (?, ?, ?)
      `).run(blockerUserId, blockedUserId, createdAt);
    },

    async deleteBlockedUser(blockerUserId: string, blockedUserId: string) {
      db.prepare('DELETE FROM blocked_users WHERE blocker_user_id = ? AND blocked_user_id = ?').run(blockerUserId, blockedUserId);
    },

    async listBlockedUserIds(blockerUserId: string) {
      const rows = db.prepare('SELECT blocked_user_id FROM blocked_users WHERE blocker_user_id = ?').all(blockerUserId) as Array<{ blocked_user_id: string }>;
      return rows.map((row) => row.blocked_user_id);
    },

    async isBlockedBetween(userA: string, userB: string) {
      return Boolean(db.prepare(`
        SELECT 1
        FROM blocked_users
        WHERE (blocker_user_id = ? AND blocked_user_id = ?)
           OR (blocker_user_id = ? AND blocked_user_id = ?)
      `).get(userA, userB, userB, userA));
    },
  };
}

function createPostgresStore(databaseUrl: string): CoreStore {
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
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          is_admin INTEGER DEFAULT 0,
          password_hash TEXT NOT NULL,
          affiliation TEXT NOT NULL,
          institution_id TEXT,
          image_url TEXT NOT NULL,
          bio TEXT NOT NULL,
          title TEXT NOT NULL DEFAULT '',
          is_email_verified INTEGER NOT NULL DEFAULT 1,
          is_affiliation_verified INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_settings (
          user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
          push_enabled INTEGER NOT NULL DEFAULT 1,
          email_enabled INTEGER NOT NULL DEFAULT 1,
          daily_digest INTEGER NOT NULL DEFAULT 1,
          weekly_digest INTEGER NOT NULL DEFAULT 1,
          new_publications INTEGER NOT NULL DEFAULT 1,
          citation_alerts INTEGER NOT NULL DEFAULT 1,
          product_updates INTEGER NOT NULL DEFAULT 0,
          delivery_day TEXT NOT NULL DEFAULT 'Friday',
          profile_visibility TEXT NOT NULL DEFAULT 'public',
          message_privacy TEXT NOT NULL DEFAULT 'everyone',
          share_privacy TEXT NOT NULL DEFAULT 'everyone'
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS follows (
          follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ NOT NULL,
          PRIMARY KEY (follower_id, following_id)
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS chats (
          id BIGSERIAL PRIMARY KEY,
          created_at TIMESTAMPTZ NOT NULL
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS chat_participants (
          chat_id BIGINT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          PRIMARY KEY (chat_id, user_id)
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id BIGSERIAL PRIMARY KEY,
          chat_id BIGINT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
          sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          text TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS preprint_shares (
          id BIGSERIAL PRIMARY KEY,
          preprint_id TEXT NOT NULL,
          sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ NOT NULL
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL,
          read_at TIMESTAMPTZ,
          action_url TEXT,
          actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS saved_searches (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          label TEXT NOT NULL,
          query_text TEXT NOT NULL,
          filters_json TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS search_analytics (
          normalized_query TEXT PRIMARY KEY,
          display_query TEXT NOT NULL,
          search_count INTEGER NOT NULL DEFAULT 0,
          last_result_count INTEGER NOT NULL DEFAULT 0,
          last_user_id TEXT,
          last_searched_at TIMESTAMPTZ NOT NULL
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS moderation_reports (
          id TEXT PRIMARY KEY,
          reporter_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          target_type TEXT NOT NULL,
          target_id TEXT NOT NULL,
          reason TEXT NOT NULL,
          details TEXT,
          status TEXT NOT NULL DEFAULT 'open',
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL,
          assigned_to_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
          escalated_at TIMESTAMPTZ,
          escalation_reason TEXT,
          reviewed_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
          reviewed_at TIMESTAMPTZ,
          resolution_note TEXT
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS moderation_actions (
          id TEXT PRIMARY KEY,
          report_id TEXT NOT NULL REFERENCES moderation_reports(id) ON DELETE CASCADE,
          actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          action_type TEXT NOT NULL,
          action_note TEXT,
          created_at TIMESTAMPTZ NOT NULL
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS blocked_users (
          blocker_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          blocked_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ NOT NULL,
          PRIMARY KEY (blocker_user_id, blocked_user_id)
        );
      `);
      await pool.query('CREATE INDEX IF NOT EXISTS idx_follows_following_id_pg ON follows(following_id)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_messages_chat_created_pg ON messages(chat_id, created_at)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_notifications_user_created_pg ON notifications(user_id, created_at DESC)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_saved_searches_user_updated_pg ON saved_searches(user_id, updated_at DESC)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_search_analytics_count_pg ON search_analytics(search_count DESC, last_searched_at DESC)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_moderation_reports_reporter_pg ON moderation_reports(reporter_user_id, created_at DESC)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_moderation_actions_report_created_pg ON moderation_actions(report_id, created_at DESC)');
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin INTEGER DEFAULT 0');
      await pool.query('ALTER TABLE moderation_reports ADD COLUMN IF NOT EXISTS assigned_to_user_id TEXT');
      await pool.query('ALTER TABLE moderation_reports ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ');
      await pool.query('ALTER TABLE moderation_reports ADD COLUMN IF NOT EXISTS escalation_reason TEXT');
      await pool.query('ALTER TABLE moderation_reports ADD COLUMN IF NOT EXISTS reviewed_by_user_id TEXT');
      await pool.query('ALTER TABLE moderation_reports ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ');
      await pool.query('ALTER TABLE moderation_reports ADD COLUMN IF NOT EXISTS resolution_note TEXT');
    },

    async findUserById(id: string) {
      const result = await pool.query<StoredUser>(`
        SELECT
          id, name, email, is_admin, affiliation, institution_id, image_url, bio, title,
          is_email_verified, is_affiliation_verified, created_at::text, password_hash
        FROM users
        WHERE id = $1
      `, [id]);
      return result.rows[0];
    },

    async findUserByEmail(email: string) {
      const result = await pool.query<StoredUser>(`
        SELECT
          id, name, email, is_admin, affiliation, institution_id, image_url, bio, title,
          is_email_verified, is_affiliation_verified, created_at::text, password_hash
        FROM users
        WHERE email = $1
      `, [email]);
      return result.rows[0];
    },

    async listUsers() {
      const result = await pool.query<StoredUser>(`
        SELECT
          id, name, email, is_admin, affiliation, institution_id, image_url, bio, title,
          is_email_verified, is_affiliation_verified, created_at::text, password_hash
        FROM users
        ORDER BY name ASC
      `);
      return result.rows;
    },

    async createUser(input) {
      await pool.query(`
        INSERT INTO users (
          id, name, email, password_hash, affiliation, institution_id, image_url, bio, title,
          is_email_verified, is_affiliation_verified, is_admin, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::timestamptz)
      `, [
        input.id,
        input.name,
        input.email,
        input.passwordHash,
        input.affiliation,
        input.institutionId ?? null,
        input.imageUrl,
        input.bio,
        input.title,
        input.isEmailVerified ? 1 : 0,
        input.isAffiliationVerified ? 1 : 0,
        input.isAdmin ? 1 : 0,
        now(),
      ]);
    },

    async setUserAdminByEmail(email: string, isAdmin: boolean) {
      await pool.query('UPDATE users SET is_admin = $1 WHERE lower(email) = lower($2)', [isAdmin ? 1 : 0, email]);
    },

    async updateUserPassword(userId: string, passwordHash: string) {
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
    },

    async markEmailVerified(userId: string) {
      await pool.query('UPDATE users SET is_email_verified = 1 WHERE id = $1', [userId]);
    },

    async updateUserProfile(input) {
      await pool.query(`
        UPDATE users
        SET
          name = $1,
          email = $2,
          affiliation = $3,
          bio = $4,
          title = $5,
          image_url = $6,
          is_email_verified = $7,
          is_affiliation_verified = $8
        WHERE id = $9
      `, [
        input.name,
        input.email,
        input.affiliation,
        input.bio,
        input.title,
        input.imageUrl,
        input.isEmailVerified ? 1 : 0,
        input.isAffiliationVerified ? 1 : 0,
        input.userId,
      ]);
    },

    async ensureDefaultSettings(userId: string) {
      await pool.query(`
        INSERT INTO user_settings (
          user_id, push_enabled, email_enabled, daily_digest, weekly_digest, new_publications,
          citation_alerts, product_updates, delivery_day, profile_visibility, message_privacy, share_privacy
        ) VALUES ($1, 1, 1, 1, 1, 1, 1, 0, 'Friday', 'public', 'everyone', 'everyone')
        ON CONFLICT (user_id) DO NOTHING
      `, [userId]);
    },

    async findSettingsByUserId(userId: string) {
      const result = await pool.query<StoredSettings>(`
        SELECT
          push_enabled, email_enabled, daily_digest, weekly_digest, new_publications,
          citation_alerts, product_updates, delivery_day, profile_visibility, message_privacy, share_privacy
        FROM user_settings
        WHERE user_id = $1
      `, [userId]);
      return result.rows[0];
    },

    async updateSettings(userId: string, settings) {
      await pool.query(`
        UPDATE user_settings SET
          push_enabled = $1,
          email_enabled = $2,
          daily_digest = $3,
          weekly_digest = $4,
          new_publications = $5,
          citation_alerts = $6,
          product_updates = $7,
          delivery_day = $8,
          profile_visibility = $9,
          message_privacy = $10,
          share_privacy = $11
        WHERE user_id = $12
      `, [
        settings.pushEnabled ? 1 : 0,
        settings.emailEnabled ? 1 : 0,
        settings.dailyDigest ? 1 : 0,
        settings.weeklyDigest ? 1 : 0,
        settings.newPublications ? 1 : 0,
        settings.citationAlerts ? 1 : 0,
        settings.productUpdates ? 1 : 0,
        settings.deliveryDay,
        settings.profileVisibility,
        settings.messagePrivacy,
        settings.sharePrivacy,
        userId,
      ]);
    },

    async getFollowerCounts() {
      const result = await pool.query<Array<{ user_id: string; followers: number | string }>[number]>(`
        SELECT following_id as user_id, COUNT(*) as followers
        FROM follows
        GROUP BY following_id
      `);
      return new Map(result.rows.map((row) => [row.user_id, toInt(row.followers)]));
    },

    async getFollowingCounts() {
      const result = await pool.query<Array<{ user_id: string; following: number | string }>[number]>(`
        SELECT follower_id as user_id, COUNT(*) as following
        FROM follows
        GROUP BY follower_id
      `);
      return new Map(result.rows.map((row) => [row.user_id, toInt(row.following)]));
    },

    async isFollowing(viewerId: string, targetUserId: string) {
      const result = await pool.query('SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2', [viewerId, targetUserId]);
      return result.rowCount > 0;
    },

    async createFollow(followerId: string, followingId: string, createdAt: string) {
      await pool.query(`
        INSERT INTO follows (follower_id, following_id, created_at)
        VALUES ($1, $2, $3::timestamptz)
        ON CONFLICT (follower_id, following_id) DO NOTHING
      `, [followerId, followingId, createdAt]);
    },

    async deleteFollow(followerId: string, followingId: string) {
      await pool.query('DELETE FROM follows WHERE follower_id = $1 AND following_id = $2', [followerId, followingId]);
    },

    async findDirectChatId(userId: string, participantId: string) {
      const result = await pool.query<{ chat_id: string | number }>(`
        SELECT cp1.chat_id as chat_id
        FROM chat_participants cp1
        JOIN chat_participants cp2 ON cp1.chat_id = cp2.chat_id
        WHERE cp1.user_id = $1 AND cp2.user_id = $2
        LIMIT 1
      `, [userId, participantId]);
      return result.rows[0] ? toInt(result.rows[0].chat_id) : undefined;
    },

    async createChat(createdAt: string) {
      const result = await pool.query<{ id: string | number }>(`
        INSERT INTO chats (created_at)
        VALUES ($1::timestamptz)
        RETURNING id
      `, [createdAt]);
      return toInt(result.rows[0].id);
    },

    async addChatParticipant(chatId: number, userId: string) {
      await pool.query(`
        INSERT INTO chat_participants (chat_id, user_id)
        VALUES ($1, $2)
        ON CONFLICT (chat_id, user_id) DO NOTHING
      `, [chatId, userId]);
    },

    async listUserChatIds(userId: string) {
      const result = await pool.query<{ id: string | number }>(`
        SELECT DISTINCT c.id
        FROM chats c
        JOIN chat_participants cp ON cp.chat_id = c.id
        LEFT JOIN messages m ON m.chat_id = c.id
        WHERE cp.user_id = $1
        GROUP BY c.id, c.created_at
        ORDER BY COALESCE(MAX(m.created_at), c.created_at) DESC, c.id DESC
      `, [userId]);
      return result.rows.map((row) => toInt(row.id));
    },

    async listChatParticipantIds(chatId: number) {
      const result = await pool.query<{ user_id: string }>('SELECT user_id FROM chat_participants WHERE chat_id = $1', [chatId]);
      return result.rows.map((row) => row.user_id);
    },

    async listChatMessages(chatId: number) {
      const result = await pool.query<Array<{ id: string | number; sender_id: string; text: string; created_at: string }>[number]>(`
        SELECT id, sender_id, text, created_at::text
        FROM messages
        WHERE chat_id = $1
        ORDER BY created_at ASC
      `, [chatId]);
      return result.rows.map((row) => ({
        id: toInt(row.id),
        sender_id: row.sender_id,
        text: row.text,
        created_at: row.created_at,
      }));
    },

    async isChatParticipant(chatId: number, userId: string) {
      const result = await pool.query('SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2', [chatId, userId]);
      return result.rowCount > 0;
    },

    async createMessage(chatId: number, senderId: string, text: string, createdAt: string) {
      await pool.query(`
        INSERT INTO messages (chat_id, sender_id, text, created_at)
        VALUES ($1, $2, $3, $4::timestamptz)
      `, [chatId, senderId, text, createdAt]);
    },

    async createPreprintShares(senderId: string, preprintId: string, recipientIds: string[], createdAt: string) {
      if (recipientIds.length === 0) {
        return;
      }
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const recipientId of recipientIds) {
          await client.query(`
            INSERT INTO preprint_shares (preprint_id, sender_id, recipient_id, created_at)
            VALUES ($1, $2, $3, $4::timestamptz)
          `, [preprintId, senderId, recipientId, createdAt]);
        }
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },

    async listNotificationsByUserId(userId: string, limit = 50) {
      const result = await pool.query<StoredNotification>(`
        SELECT
          id, user_id, type, title, description, created_at::text, read_at::text, action_url, actor_user_id
        FROM notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `, [userId, limit]);
      return result.rows;
    },

    async createNotification(input) {
      await pool.query(`
        INSERT INTO notifications (
          id, user_id, type, title, description, created_at, read_at, action_url, actor_user_id
        ) VALUES ($1, $2, $3, $4, $5, $6::timestamptz, NULL, $7, $8)
      `, [
        crypto.randomUUID(),
        input.userId,
        input.type,
        input.title,
        input.description,
        input.createdAt,
        input.actionUrl ?? null,
        input.actorUserId ?? null,
      ]);
    },

    async markNotificationsRead(userId: string) {
      await pool.query('UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL', [userId]);
    },

    async markNotificationRead(userId: string, notificationId: string) {
      await pool.query('UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND id = $2 AND read_at IS NULL', [userId, notificationId]);
    },

    async countUnreadNotificationsByActionUrl(userId: string, actionUrl: string) {
      const result = await pool.query<{ count: string }>(`
        SELECT COUNT(*)::text as count
        FROM notifications
        WHERE user_id = $1 AND action_url = $2 AND read_at IS NULL
      `, [userId, actionUrl]);
      return toInt(result.rows[0]?.count ?? 0);
    },

    async markNotificationsReadByActionUrl(userId: string, actionUrl: string) {
      await pool.query(`
        UPDATE notifications
        SET read_at = NOW()
        WHERE user_id = $1 AND action_url = $2 AND read_at IS NULL
      `, [userId, actionUrl]);
    },

    async listSavedSearchesByUserId(userId: string) {
      const result = await pool.query<StoredSavedSearch>(`
        SELECT id, user_id, label, query_text, filters_json, created_at::text, updated_at::text
        FROM saved_searches
        WHERE user_id = $1
        ORDER BY updated_at DESC
      `, [userId]);
      return result.rows;
    },

    async upsertSavedSearch(input) {
      const existing = await pool.query<{ id: string }>(
        'SELECT id FROM saved_searches WHERE user_id = $1 AND label = $2',
        [input.userId, input.label],
      );
      if (existing.rows[0]) {
        const result = await pool.query<StoredSavedSearch>(`
          UPDATE saved_searches
          SET query_text = $1, filters_json = $2, updated_at = $3::timestamptz
          WHERE id = $4
          RETURNING id, user_id, label, query_text, filters_json, created_at::text, updated_at::text
        `, [input.queryText, input.filtersJson, input.savedAt, existing.rows[0].id]);
        return result.rows[0];
      }
      const result = await pool.query<StoredSavedSearch>(`
        INSERT INTO saved_searches (id, user_id, label, query_text, filters_json, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7::timestamptz)
        RETURNING id, user_id, label, query_text, filters_json, created_at::text, updated_at::text
      `, [crypto.randomUUID(), input.userId, input.label, input.queryText, input.filtersJson, input.savedAt, input.savedAt]);
      return result.rows[0];
    },

    async deleteSavedSearch(userId: string, savedSearchId: string) {
      await pool.query('DELETE FROM saved_searches WHERE id = $1 AND user_id = $2', [savedSearchId, userId]);
    },

    async recordSearchAnalytics(input) {
      await pool.query(`
        INSERT INTO search_analytics (
          normalized_query, display_query, search_count, last_result_count, last_user_id, last_searched_at
        ) VALUES ($1, $2, 1, $3, $4, $5::timestamptz)
        ON CONFLICT (normalized_query) DO UPDATE SET
          display_query = EXCLUDED.display_query,
          search_count = search_analytics.search_count + 1,
          last_result_count = EXCLUDED.last_result_count,
          last_user_id = EXCLUDED.last_user_id,
          last_searched_at = EXCLUDED.last_searched_at
      `, [
        input.normalizedQuery,
        input.queryText,
        input.resultCount,
        input.userId ?? null,
        input.searchedAt,
      ]);
    },

    async listPopularSearches(limit: number, prefix?: string) {
      const result = prefix?.trim()
        ? await pool.query<StoredPopularSearch>(`
            SELECT normalized_query, display_query, search_count, last_result_count, last_user_id, last_searched_at::text
            FROM search_analytics
            WHERE normalized_query LIKE $1
            ORDER BY search_count DESC, last_searched_at DESC
            LIMIT $2
          `, [`${prefix.trim().toLowerCase()}%`, limit])
        : await pool.query<StoredPopularSearch>(`
            SELECT normalized_query, display_query, search_count, last_result_count, last_user_id, last_searched_at::text
            FROM search_analytics
            ORDER BY search_count DESC, last_searched_at DESC
            LIMIT $1
          `, [limit]);
      return result.rows;
    },

    async createModerationReport(input) {
      const report = {
        id: crypto.randomUUID(),
        reporter_user_id: input.reporterUserId,
        target_type: input.targetType,
        target_id: input.targetId,
        reason: input.reason,
        details: input.details ?? null,
        status: 'open' as const,
        created_at: input.createdAt,
        updated_at: input.createdAt,
        assigned_to_user_id: null,
        escalated_at: null,
        escalation_reason: null,
        reviewed_by_user_id: null,
        reviewed_at: null,
        resolution_note: null,
      };
      await pool.query(`
        INSERT INTO moderation_reports (
          id, reporter_user_id, target_type, target_id, reason, details, status, created_at, updated_at,
          assigned_to_user_id, escalated_at, escalation_reason, reviewed_by_user_id, reviewed_at, resolution_note
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9::timestamptz, $10, $11::timestamptz, $12, $13, $14::timestamptz, $15)
      `, [
        report.id,
        report.reporter_user_id,
        report.target_type,
        report.target_id,
        report.reason,
        report.details,
        report.status,
        report.created_at,
        report.updated_at,
        report.assigned_to_user_id,
        report.escalated_at,
        report.escalation_reason,
        report.reviewed_by_user_id,
        report.reviewed_at,
        report.resolution_note,
      ]);
      await pool.query(`
        INSERT INTO moderation_actions (id, report_id, actor_user_id, action_type, action_note, created_at)
        VALUES ($1, $2, $3, $4, $5, $6::timestamptz)
      `, [crypto.randomUUID(), report.id, input.reporterUserId, 'reported', input.details ?? null, input.createdAt]);
      return report;
    },

    async listModerationReports(statuses) {
      if (!statuses || statuses.length === 0) {
        const result = await pool.query<StoredModerationReport>('SELECT * FROM moderation_reports ORDER BY created_at DESC');
        return result.rows;
      }
      const result = await pool.query<StoredModerationReport>(
        'SELECT * FROM moderation_reports WHERE status = ANY($1::text[]) ORDER BY created_at DESC',
        [statuses],
      );
      return result.rows;
    },

    async assignModerationReport(reportId, assignedToUserId, assignedAt, actorUserId) {
      const result = await pool.query<StoredModerationReport>(`
        UPDATE moderation_reports
        SET assigned_to_user_id = $1, updated_at = $2::timestamptz
        WHERE id = $3
        RETURNING *
      `, [assignedToUserId, assignedAt, reportId]);
      if (result.rows[0]) {
        await pool.query(`
          INSERT INTO moderation_actions (id, report_id, actor_user_id, action_type, action_note, created_at)
          VALUES ($1, $2, $3, $4, $5, $6::timestamptz)
        `, [crypto.randomUUID(), reportId, actorUserId, 'assigned', assignedToUserId, assignedAt]);
      }
      return result.rows[0];
    },

    async escalateModerationReport(input) {
      const result = await pool.query<StoredModerationReport>(`
        UPDATE moderation_reports
        SET escalated_at = $1::timestamptz, escalation_reason = $2, updated_at = $1::timestamptz
        WHERE id = $3
        RETURNING *
      `, [input.escalatedAt, input.escalationReason, input.reportId]);
      if (result.rows[0]) {
        await pool.query(`
          INSERT INTO moderation_actions (id, report_id, actor_user_id, action_type, action_note, created_at)
          VALUES ($1, $2, $3, $4, $5, $6::timestamptz)
        `, [crypto.randomUUID(), input.reportId, input.actorUserId, 'escalated', input.escalationReason, input.escalatedAt]);
      }
      return result.rows[0];
    },

    async reviewModerationReport(input) {
      const result = await pool.query<StoredModerationReport>(`
        UPDATE moderation_reports
        SET status = $1, reviewed_by_user_id = $2, reviewed_at = $3::timestamptz, resolution_note = $4, updated_at = $3::timestamptz
        WHERE id = $5
        RETURNING *
      `, [
        input.status,
        input.reviewedByUserId,
        input.reviewedAt,
        input.resolutionNote ?? null,
        input.reportId,
      ]);
      if (result.rows[0]) {
        await pool.query(`
          INSERT INTO moderation_actions (id, report_id, actor_user_id, action_type, action_note, created_at)
          VALUES ($1, $2, $3, $4, $5, $6::timestamptz)
        `, [crypto.randomUUID(), input.reportId, input.reviewedByUserId, input.status, input.resolutionNote ?? null, input.reviewedAt]);
      }
      return result.rows[0];
    },

    async listModerationActionsByReportId(reportId) {
      const result = await pool.query<StoredModerationAction>(`
        SELECT id, report_id, actor_user_id, action_type, action_note, created_at::text
        FROM moderation_actions
        WHERE report_id = $1
        ORDER BY created_at DESC
      `, [reportId]);
      return result.rows;
    },

    async createBlockedUser(blockerUserId: string, blockedUserId: string, createdAt: string) {
      await pool.query(`
        INSERT INTO blocked_users (blocker_user_id, blocked_user_id, created_at)
        VALUES ($1, $2, $3::timestamptz)
        ON CONFLICT (blocker_user_id, blocked_user_id) DO NOTHING
      `, [blockerUserId, blockedUserId, createdAt]);
    },

    async deleteBlockedUser(blockerUserId: string, blockedUserId: string) {
      await pool.query('DELETE FROM blocked_users WHERE blocker_user_id = $1 AND blocked_user_id = $2', [blockerUserId, blockedUserId]);
    },

    async listBlockedUserIds(blockerUserId: string) {
      const result = await pool.query<{ blocked_user_id: string }>(
        'SELECT blocked_user_id FROM blocked_users WHERE blocker_user_id = $1 ORDER BY created_at DESC',
        [blockerUserId],
      );
      return result.rows.map((row) => row.blocked_user_id);
    },

    async isBlockedBetween(userA: string, userB: string) {
      const result = await pool.query(
        `SELECT 1
         FROM blocked_users
         WHERE (blocker_user_id = $1 AND blocked_user_id = $2)
            OR (blocker_user_id = $2 AND blocked_user_id = $1)
         LIMIT 1`,
        [userA, userB],
      );
      return result.rowCount > 0;
    },
  };
}

const usePostgresCoreStore =
  (process.env.ENABLE_POSTGRES_APP_STORE === '1' || process.env.ENABLE_POSTGRES_CORE_STORE === '1')
  && process.env.DATABASE_URL;

export const coreStore = usePostgresCoreStore
  ? createPostgresStore(process.env.DATABASE_URL!)
  : createSqliteStore();
