export interface PaperComment {
  id: string;
  userId: string;
  userName: string;
  userImageUrl: string;
  text: string;
  date: string;
  likes: number;
}

export interface Preprint {
  id: string;
  title: string;
  authors: string[];
  source: string;
  date: string;
  publishedAt?: string;
  tags: string[];
  abstract: string;
  isSaved?: boolean;
  citations?: number;
  rating?: number;
  userRating?: number;
  views?: number;
  savesCount?: number;
  type?: string;
  comments?: PaperComment[];
  citedBy?: string[]; // User IDs or Names
  references?: string[]; // Paper IDs or Titles
  savedBy?: string[]; // User IDs
  ratedBy?: { userId: string, rating: number }[];
  doi?: string;
  url?: string;
  pdfUrl?: string;
  searchSnippet?: string;
  matchedFields?: string[];
}

export interface SavedSearch {
  id: string;
  label: string;
  queryText: string;
  filters: {
    sources?: string[];
    categories?: string[];
    publicationType?: string;
    sortBy?: string;
    dateRange?: string;
    startDate?: string;
    endDate?: string;
  };
  updatedAt: string;
}

export interface SearchSuggestion {
  label: string;
  type: 'title' | 'author' | 'tag' | 'doi' | 'query';
}

export interface PopularSearch {
  query: string;
  count: number;
  lastSearchedAt: string;
  lastResultCount: number;
}

export interface ContentSource {
  id: string;
  label: string;
  description: string;
}

export interface ContentSyncDefinition {
  id: string;
  sourceId: string;
  sourceLabel: string;
  query: string;
  maxResults: number;
  intervalMinutes: number;
  enabled: boolean;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  lastStatus?: string | null;
  lastError?: string | null;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  title?: string;
  email?: string;
  isAdmin?: boolean;
  isEmailVerified?: boolean;
  isAffiliationVerified?: boolean;
  hasTwoFactorEnabled?: boolean;
  affiliation: string;
  institutionId?: string;
  imageUrl: string;
  bio: string;
  publications: string[]; // IDs of preprints
  followers: number;
  following: number;
  isFollowing?: boolean;
  stats: {
    preprints: number;
    citations: number;
    followers: number;
    hIndex?: number;
    i10Index?: number;
    totalPublications?: number;
  };
}

export interface TrustedDevice {
  id: string;
  name: string;
  type: 'Desktop' | 'Mobile' | 'Tablet';
  location: string;
  lastActive: string;
  isCurrent: boolean;
  accessType: 'session' | 'trusted';
  browser?: string;
  platform?: string;
  trustedUntil?: string;
}

export interface SecurityEvent {
  id: string;
  type: 'login' | 'password' | '2fa' | 'device' | 'session';
  title: string;
  device: string;
  location: string;
  time: string;
  current?: boolean;
  alert?: boolean;
}

export interface PasskeyCredential {
  id: string;
  label: string;
  createdAt: string;
  lastUsedAt: string;
  deviceType: 'singleDevice' | 'multiDevice';
  backedUp: boolean;
  transports: string[];
}

export interface SecuritySummary {
  hasPassword: boolean;
  hasTwoFactorEnabled: boolean;
  backupCodesRemaining: number;
  passkeyCount: number;
  trustedDeviceCount: number;
  isEmailVerified: boolean;
}

export interface EncryptionKeyRecord {
  id: string;
  name: string;
  created: string;
  status: 'Active' | 'Stored' | 'Archived';
}

export interface Institution {
  id: string;
  name: string;
  location: string;
  imageUrl: string;
  description: string;
  stats: {
    researchers: number;
    publications: number;
    citations: number;
  };
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  preprintIds?: string[];
  sharedWith?: string[];
  shareLinkToken?: string;
  paperCount: number;
  totalCitations?: number;
  updatedAt: string;
  imageUrl: string;
}

export interface CustomFeed {
  id: string;
  name: string;
  keywords: string[];
  sources: string[];
  sourceCategories?: Record<string, string[]>;
  frequency: 'Real-time' | 'Daily' | 'Weekly';
  isActive: boolean;
}

export interface Notification {
  id: string;
  type: 'feed' | 'citation' | 'collab' | 'share' | 'comment';
  title: string;
  description: string;
  time: string;
  isNew?: boolean;
  actionUrl?: string;
}

export interface SupportTicket {
  id: string;
  category: 'bug' | 'feature' | 'account' | 'data';
  subject: string;
  message: string;
  submittedAt: string;
  status: 'submitted' | 'queued';
  requesterName?: string;
  requesterEmail?: string;
}

export interface ModerationReport {
  id: string;
  reporterUserId: string;
  reporterName: string;
  targetType: 'user' | 'preprint' | 'chat' | 'message' | 'comment';
  targetId: string;
  reason: 'spam' | 'harassment' | 'misinformation' | 'copyright' | 'other';
  details?: string;
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
  createdAt: string;
  updatedAt: string;
  assignedToUserId?: string;
  assigneeName?: string;
  escalatedAt?: string;
  escalationReason?: string;
  reviewedAt?: string;
  reviewerName?: string;
  resolutionNote?: string;
  evidence?: {
    label: string;
    value: string;
  }[];
}

export interface ModerationAction {
  id: string;
  reportId: string;
  actorUserId: string;
  actorName: string;
  actionType: 'reported' | 'assigned' | 'reviewing' | 'resolved' | 'dismissed' | 'escalated';
  actionNote?: string;
  createdAt: string;
}

export interface TrendMetric {
  label: string;
  value: string;
  change: string;
  icon: string;
  trend: 'up' | 'down' | 'neutral';
}

export interface RisingStar {
  id: string;
  name: string;
  affiliation: string;
  growth: string;
  imageUrl: string;
}

export interface DigestPaper {
  id: string;
  title: string;
  authors: string;
  source: string;
  imageUrl: string;
  topic: string;
}

export interface DigestActivity {
  id: string;
  type: 'citation' | 'collaborator';
  text: string;
  highlight?: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  createdAt?: string;
}

export interface Chat {
  id: string;
  participants: string[]; // User IDs
  lastMessage?: string;
  lastMessageTime?: string;
  lastMessageAt?: string;
  unreadCount: number;
  messages: Message[];
}

export interface PublicationVolumePoint {
  month: string;
  papers: number;
}

export interface WeeklyTrendPoint {
  day: string;
  quantum: number;
  ai: number;
}

export interface AppDataset {
  preprints: Preprint[];
  collections: Collection[];
  notifications: Notification[];
  customFeeds: CustomFeed[];
  trendMetrics: TrendMetric[];
  risingStars: RisingStar[];
  digestPapers: DigestPaper[];
  digestActivity: DigestActivity[];
  users: User[];
  institutions: Institution[];
  chats: Chat[];
  publicationVolume: PublicationVolumePoint[];
  weeklyTrends: WeeklyTrendPoint[];
  metadata: {
    sourceLabel: string;
    isImported: boolean;
    lastUpdated: string;
  };
}

export interface DatasetImportResult {
  dataset: AppDataset;
  warnings: string[];
}
