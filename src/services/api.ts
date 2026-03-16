import { Chat, Collection, ContentSource, ContentSyncDefinition, ModerationAction, ModerationReport, Notification, PasskeyCredential, PopularSearch, Preprint, ProductAnnouncement, SavedSearch, SearchSuggestion, SecurityEvent, SecuritySummary, TrustedDevice, User } from '../types';

let csrfToken: string | null = null;

type Settings = {
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
};

type DigestSendResponse = {
  kind: 'daily' | 'weekly';
  recipient: string;
  subject: string;
  paperCount: number;
  delivery: {
    delivered: boolean;
    provider: 'smtp' | 'debug';
  };
};

type AuthPayload = {
  user: User;
  settings: Settings;
  social: {
    users: User[];
    chats: Chat[];
  };
  csrfToken: string;
};

type TwoFactorLoginPayload = {
  requiresTwoFactor: true;
  challengeToken: string;
  user: {
    id: string;
    name: string;
    email?: string;
  };
};

type TwoFactorSetupPayload = {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
};

type TwoFactorStatusPayload = {
  enabled: boolean;
  hasPendingSetup: boolean;
  backupCodesRemaining: number;
};

type PasskeyOptionsPayload = {
  challengeId: string;
  options: unknown;
};

type BackendDatasetPayload = {
  sourceLabel: string;
  preprints: Preprint[];
};

type ContentIngestPayload = {
  imported: number;
  dataset: BackendDatasetPayload;
};

async function request<T>(path: string, init?: RequestInit, options?: { requireCsrf?: boolean }): Promise<T> {
  const method = init?.method?.toUpperCase() ?? 'GET';
  const needsCsrf = options?.requireCsrf ?? !['GET', 'HEAD', 'OPTIONS'].includes(method);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (needsCsrf) {
    if (!csrfToken) {
      const csrfResponse = await fetch('/api/auth/csrf', { credentials: 'include' });
      if (!csrfResponse.ok) {
        throw new Error('Unable to initialize secure session');
      }
      const csrfPayload = await csrfResponse.json() as { csrfToken: string };
      csrfToken = csrfPayload.csrfToken;
    }
    headers['X-CSRF-Token'] = csrfToken;
  }

  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(body.error ?? 'Request failed');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await response.json() as T;
  if (isAuthPayload(payload)) {
    csrfToken = payload.csrfToken;
  }
  return payload;
}

function isAuthPayload(value: unknown): value is AuthPayload {
  return typeof value === 'object' && value !== null && 'csrfToken' in value;
}

export async function login(email: string, password: string) {
  return request<AuthPayload | TwoFactorLoginPayload>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }, { requireCsrf: false });
}

export async function completeTwoFactorLogin(challengeToken: string, code: string, rememberDevice = false) {
  return request<AuthPayload>('/api/auth/2fa/login', {
    method: 'POST',
    body: JSON.stringify({ challengeToken, code, rememberDevice }),
  }, { requireCsrf: false });
}

export async function register(name: string, email: string, affiliation: string, password: string) {
  return request<AuthPayload>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, affiliation, password }),
  }, { requireCsrf: false });
}

export async function getCurrentSession() {
  return request<AuthPayload>('/api/auth/me');
}

export async function logout() {
  return request<void>('/api/auth/logout', { method: 'POST' });
}

export async function rotateSession() {
  return request<AuthPayload>('/api/auth/rotate-session', { method: 'POST' });
}

export async function logoutOtherSessions() {
  return request<void>('/api/auth/logout-others', { method: 'POST' });
}

export async function updateSettings(settings: Partial<Settings>) {
  return request<Settings>('/api/settings', {
    method: 'PATCH',
    body: JSON.stringify(settings),
  });
}

export async function sendDigestNow(kind: 'daily' | 'weekly') {
  return request<DigestSendResponse>('/api/digests/send-now', {
    method: 'POST',
    body: JSON.stringify({ kind }),
  });
}

export async function fetchPushPublicKey() {
  return request<{ publicKey: string | null }>('/api/push/public-key');
}

export async function subscribeToPushNotifications(subscription: PushSubscriptionJSON) {
  return request<{ ok: boolean }>('/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify(subscription),
  });
}

export async function unsubscribeFromPushNotifications(subscription: PushSubscriptionJSON) {
  return request<void>('/api/push/subscribe', {
    method: 'DELETE',
    body: JSON.stringify(subscription),
  });
}

export async function fetchProductAnnouncements() {
  return request<{ announcements: ProductAnnouncement[] }>('/api/admin/product-updates');
}

export async function publishProductAnnouncement(payload: {
  title: string;
  message: string;
  actionUrl?: string;
}) {
  return request<{ announcement: ProductAnnouncement }>('/api/admin/product-updates', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateProfile(payload: {
  name: string;
  email: string;
  orcidId?: string;
  affiliation: string;
  bio: string;
  title: string;
  imageUrl: string;
  isAffiliationVerified?: boolean;
  currentPassword?: string;
}) {
  return request<{ user: User; social: { users: User[]; chats: Chat[] } }>('/api/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function importProfilePublications(payload: {
  source: 'orcid' | 'arxiv';
  authorName?: string;
  orcidId?: string;
  maxResults?: number;
}) {
  return request<ContentIngestPayload & { sourceLabel: string }>('/api/profile/publications/import', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function requestEmailVerification() {
  return request<{ message: string; debugToken?: string }>('/api/auth/request-email-verification', {
    method: 'POST',
  });
}

export async function verifyEmail(token: string) {
  return request<void>('/api/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  }, { requireCsrf: false });
}

export async function requestPasswordReset(email: string) {
  return request<{ message: string; debugToken?: string }>('/api/auth/request-password-reset', {
    method: 'POST',
    body: JSON.stringify({ email }),
  }, { requireCsrf: false });
}

export async function resetPassword(token: string, password: string) {
  return request<void>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  }, { requireCsrf: false });
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const payload = await request<{ csrfToken: string }>('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  csrfToken = payload.csrfToken;
  return payload;
}

export async function reauthenticate(payload: { currentPassword?: string; twoFactorCode?: string }) {
  return request<void>('/api/auth/re-auth', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function reauthenticateWithPasskey() {
  const [{ startAuthentication }, payload] = await Promise.all([
    import('@simplewebauthn/browser'),
    request<PasskeyOptionsPayload>('/api/auth/re-auth/passkey/options', {
      method: 'POST',
    }),
  ]);
  const response = await startAuthentication({
    optionsJSON: payload.options as Parameters<typeof startAuthentication>[0]['optionsJSON'],
  });
  return request<void>('/api/auth/re-auth/passkey/verify', {
    method: 'POST',
    body: JSON.stringify({
      challengeId: payload.challengeId,
      response,
    }),
  });
}

export async function getTwoFactorStatus() {
  return request<TwoFactorStatusPayload>('/api/auth/2fa/status');
}

export async function startTwoFactorSetup() {
  return request<TwoFactorSetupPayload>('/api/auth/2fa/setup', {
    method: 'POST',
  });
}

export async function enableTwoFactor(code: string) {
  return request<{ backupCodes: string[] }>('/api/auth/2fa/enable', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function disableTwoFactor(code: string) {
  return request<void>('/api/auth/2fa/disable', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function regenerateBackupCodes(code: string) {
  return request<{ backupCodes: string[] }>('/api/auth/2fa/regenerate-backup-codes', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function fetchTrustedDevices() {
  return request<{ devices: TrustedDevice[] }>('/api/auth/trusted-devices');
}

export async function revokeTrustedDevice(deviceId: string) {
  return request<void>(`/api/auth/trusted-devices/${deviceId}`, {
    method: 'DELETE',
  });
}

export async function fetchSecurityEvents() {
  return request<{ events: SecurityEvent[] }>('/api/auth/security-events');
}

export async function fetchPasskeys() {
  return request<{ passkeys: PasskeyCredential[] }>('/api/auth/passkeys');
}

export async function fetchSecuritySummary() {
  return request<SecuritySummary>('/api/auth/security-summary');
}

export async function registerPasskey(label?: string) {
  const [{ startRegistration }, payload] = await Promise.all([
    import('@simplewebauthn/browser'),
    request<PasskeyOptionsPayload>('/api/auth/passkeys/register/options', {
      method: 'POST',
    }),
  ]);
  const response = await startRegistration({
    optionsJSON: payload.options as Parameters<typeof startRegistration>[0]['optionsJSON'],
  });
  return request<{ passkeys: PasskeyCredential[] }>('/api/auth/passkeys/register/verify', {
    method: 'POST',
    body: JSON.stringify({
      challengeId: payload.challengeId,
      response,
      label,
    }),
  });
}

export async function deletePasskey(passkeyId: string) {
  return request<void>(`/api/auth/passkeys/${passkeyId}`, {
    method: 'DELETE',
  });
}

export async function signInWithPasskey(email: string) {
  const [{ startAuthentication }, payload] = await Promise.all([
    import('@simplewebauthn/browser'),
    request<PasskeyOptionsPayload>('/api/auth/passkeys/authenticate/options', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }, { requireCsrf: false }),
  ]);
  const response = await startAuthentication({
    optionsJSON: payload.options as Parameters<typeof startAuthentication>[0]['optionsJSON'],
  });
  return request<AuthPayload>('/api/auth/passkeys/authenticate/verify', {
    method: 'POST',
    body: JSON.stringify({
      challengeId: payload.challengeId,
      response,
    }),
  }, { requireCsrf: false });
}

export async function fetchSocialBootstrap() {
  return request<{ users: User[]; chats: Chat[] }>('/api/social/bootstrap');
}

export async function fetchNotifications() {
  return request<{ notifications: Notification[] }>('/api/notifications');
}

export async function fetchCollections() {
  return request<{ collections: Collection[] }>('/api/collections');
}

export async function createCollection(payload: {
  name: string;
  description?: string;
  imageUrl?: string;
}) {
  return request<{ collections: Collection[] }>('/api/collections', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateCollection(collectionId: string, payload: {
  name: string;
  description?: string;
  imageUrl?: string;
}) {
  return request<{ collections: Collection[] }>(`/api/collections/${collectionId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function updateCollectionPapers(collectionId: string, preprintIds: string[]) {
  return request<{ collections: Collection[] }>(`/api/collections/${collectionId}/papers`, {
    method: 'PATCH',
    body: JSON.stringify({ preprintIds }),
  });
}

export async function updateCollectionAccess(collectionId: string, collaborators: Array<{ email: string; role: 'viewer' | 'editor' }>) {
  return request<{ collections: Collection[] }>(`/api/collections/${collectionId}/access`, {
    method: 'PATCH',
    body: JSON.stringify({ collaborators }),
  });
}

export async function markNotificationsRead() {
  return request<void>('/api/notifications/mark-read', { method: 'POST' });
}

export async function markNotificationRead(notificationId: string) {
  return request<void>(`/api/notifications/${notificationId}/mark-read`, { method: 'POST' });
}

export async function markChatRead(chatId: string) {
  return request<{ chat: Chat }>(`/api/chats/${chatId}/mark-read`, { method: 'POST' });
}

export async function fetchBlockedUsers() {
  return request<{ blockedUserIds: string[] }>('/api/moderation/blocked-users');
}

export async function blockUser(blockedUserId: string) {
  return request<{ blockedUserIds: string[] }>('/api/moderation/block-user', {
    method: 'POST',
    body: JSON.stringify({ blockedUserId }),
  });
}

export async function unblockUser(blockedUserId: string) {
  return request<void>(`/api/moderation/block-user/${blockedUserId}`, {
    method: 'DELETE',
  });
}

export async function reportContent(payload: {
  targetType: 'user' | 'preprint' | 'chat' | 'message' | 'comment';
  targetId: string;
  reason: 'spam' | 'harassment' | 'misinformation' | 'copyright' | 'other';
  details?: string;
}) {
  return request<{ reportId: string }>('/api/moderation/report', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchModerationReports(status?: 'open' | 'reviewing' | 'resolved' | 'dismissed' | 'all') {
  const search = status && status !== 'all' ? `?status=${status}` : '';
  return request<{ reports: ModerationReport[]; moderators: Pick<User, 'id' | 'name'>[] }>(`/api/admin/moderation/reports${search}`);
}

export async function fetchModerationReport(reportId: string) {
  return request<{ report: ModerationReport; actions: ModerationAction[] }>(`/api/admin/moderation/reports/${reportId}`);
}

export async function reviewModerationReport(reportId: string, payload: {
  status: 'reviewing' | 'resolved' | 'dismissed';
  resolutionNote?: string;
}) {
  return request<{ report: ModerationReport }>(`/api/admin/moderation/reports/${reportId}/review`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function assignModerationReport(reportId: string, assignedToUserId: string | null) {
  return request<{ report: ModerationReport }>(`/api/admin/moderation/reports/${reportId}/assign`, {
    method: 'POST',
    body: JSON.stringify({ assignedToUserId }),
  });
}

export async function escalateModerationReport(reportId: string, escalationReason: string) {
  return request<{ report: ModerationReport }>(`/api/admin/moderation/reports/${reportId}/escalate`, {
    method: 'POST',
    body: JSON.stringify({ escalationReason }),
  });
}

export async function bulkModerationAction(payload: {
  reportIds: string[];
  action: 'assign' | 'review' | 'escalate';
  assignedToUserId?: string | null;
  status?: 'reviewing' | 'resolved' | 'dismissed';
  resolutionNote?: string;
  escalationReason?: string;
}) {
  return request<{ reports: ModerationReport[] }>('/api/admin/moderation/reports/bulk', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function followUser(userId: string) {
  return request<{ users: User[]; chats: Chat[] }>(`/api/social/follow/${userId}`, { method: 'POST' });
}

export async function unfollowUser(userId: string) {
  return request<{ users: User[]; chats: Chat[] }>(`/api/social/follow/${userId}`, { method: 'DELETE' });
}

export async function fetchUserConnections(userId: string) {
  return request<{ followers: User[]; following: User[] }>(`/api/social/profile/${userId}/connections`);
}

export async function sharePreprint(preprintId: string, recipientIds: string[]) {
  return request<{ shared: number }>('/api/social/share', {
    method: 'POST',
    body: JSON.stringify({ preprintId, recipientIds }),
  });
}

export async function createChat(participantId: string) {
  return request<{ chat: Chat }>('/api/chats', {
    method: 'POST',
    body: JSON.stringify({ participantId }),
  });
}

export async function sendMessage(chatId: string, text: string) {
  return request<{ chat: Chat }>(`/api/chats/${chatId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export async function fetchBackendPreprints() {
  return request<BackendDatasetPayload>('/api/content/preprints');
}

export async function searchBackendPreprints(params: {
  query?: string;
  keywords?: string[];
  sources?: string[];
  categories?: string[];
  publicationType?: string;
  sortBy?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  const searchParams = new URLSearchParams();
  if (params.query?.trim()) searchParams.set('q', params.query.trim());
  if (params.keywords && params.keywords.length > 0) searchParams.set('keywords', params.keywords.join(','));
  if (params.sources && params.sources.length > 0) searchParams.set('sources', params.sources.join(','));
  if (params.categories && params.categories.length > 0) searchParams.set('categories', params.categories.join(','));
  if (params.publicationType && params.publicationType !== 'All Types') searchParams.set('publicationType', params.publicationType);
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.startDate) searchParams.set('startDate', params.startDate);
  if (params.endDate) searchParams.set('endDate', params.endDate);
  if (params.limit) searchParams.set('limit', String(params.limit));
  const suffix = searchParams.toString();
  return request<{ total: number; preprints: Preprint[] }>(`/api/content/search${suffix ? `?${suffix}` : ''}`);
}

export async function fetchSearchSuggestions(query: string) {
  const suffix = new URLSearchParams({ q: query }).toString();
  return request<{ suggestions: SearchSuggestion[] }>(`/api/content/search/suggestions?${suffix}`);
}

export async function fetchSearchAnalytics() {
  return request<{ popularSearches: PopularSearch[] }>('/api/content/search/analytics');
}

export async function fetchSavedSearches() {
  return request<{ searches: SavedSearch[] }>('/api/searches');
}

export async function saveSearch(payload: {
  label: string;
  queryText: string;
  filters: SavedSearch['filters'];
}) {
  return request<{ search: SavedSearch }>('/api/searches', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteSavedSearch(searchId: string) {
  return request<void>(`/api/searches/${searchId}`, {
    method: 'DELETE',
  });
}

export async function ingestArxivContent(query: string, maxResults = 15) {
  return request<ContentIngestPayload>('/api/content/ingest/arxiv', {
    method: 'POST',
    body: JSON.stringify({ query, maxResults }),
  });
}

export async function ingestCrossrefContent(query: string, maxResults = 15) {
  return request<ContentIngestPayload>('/api/content/ingest/crossref', {
    method: 'POST',
    body: JSON.stringify({ query, maxResults }),
  });
}

export async function fetchContentSources() {
  return request<{ sources: ContentSource[] }>('/api/content/sources');
}

export async function ingestContentSource(sourceId: string, query: string, maxResults = 15) {
  return request<ContentIngestPayload>(`/api/content/ingest/${sourceId}`, {
    method: 'POST',
    body: JSON.stringify({ query, maxResults }),
  });
}

export async function fetchContentSyncDefinitions() {
  return request<{ syncDefinitions: ContentSyncDefinition[] }>('/api/content/sync-definitions');
}

export async function saveContentSyncDefinition(payload: {
  id?: string;
  sourceId: string;
  query: string;
  maxResults?: number;
  intervalMinutes: number;
  enabled?: boolean;
}) {
  return request<{ syncDefinition: ContentSyncDefinition }>('/api/content/sync-definitions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteContentSyncDefinition(definitionId: string) {
  return request<void>(`/api/content/sync-definitions/${definitionId}`, {
    method: 'DELETE',
  });
}

export function clearCsrfToken() {
  csrfToken = null;
}

export type { Settings, AuthPayload, TwoFactorLoginPayload };
