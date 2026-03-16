import {
  MOCK_CHATS,
  MOCK_COLLECTIONS,
  MOCK_CUSTOM_FEEDS,
  MOCK_DIGEST_ACTIVITY,
  MOCK_DIGEST_PAPERS,
  MOCK_INSTITUTIONS,
  MOCK_NOTIFICATIONS,
  MOCK_PREPRINTS,
  MOCK_PUBLICATION_VOLUME,
  MOCK_RISING_STARS,
  MOCK_TREND_METRICS,
  MOCK_USERS,
  MOCK_WEEKLY_TRENDS,
} from '../mockData';
import {
  AppDataset,
  Chat,
  Collection,
  CustomFeed,
  DatasetImportResult,
  DigestActivity,
  DigestPaper,
  Institution,
  Notification,
  Preprint,
  PublicationVolumePoint,
  RisingStar,
  TrendMetric,
  User,
  WeeklyTrendPoint,
} from '../types';

const DATASET_STORAGE_KEY = 'preprint_explorer_dataset_v1';

type LooseRecord = Record<string, unknown>;
type HydrateInput = {
  preprints?: unknown[];
  collections?: unknown[];
  notifications?: unknown[];
  customFeeds?: unknown[];
  trendMetrics?: TrendMetric[];
  risingStars?: RisingStar[];
  digestPapers?: unknown[];
  digestActivity?: unknown[];
  users?: unknown[];
  institutions?: unknown[];
  chats?: unknown[];
  publicationVolume?: PublicationVolumePoint[];
  weeklyTrends?: WeeklyTrendPoint[];
};

const DEFAULT_SOURCE = 'Imported';
const DEFAULT_LAST_UPDATED = () => new Date().toISOString();

function isRecord(value: unknown): value is LooseRecord {
  return typeof value === 'object' && value !== null;
}

function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toStringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function toNumberValue(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function toStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map(item => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  }
  return [];
}

function isoOrDisplayDate(input: string): string {
  if (!input) {
    return '';
  }
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return input;
  }
  return date.toISOString();
}

function formatDateLabel(input: string): string {
  if (!input) {
    return 'Unknown date';
  }
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return input;
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function titleToId(value: string, fallbackPrefix: string, index: number): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || `${fallbackPrefix}-${index + 1}`;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalizePreprint(input: unknown, index: number): Preprint {
  const item = isRecord(input) ? input : {};
  const title = toStringValue(item.title ?? item.name, `Untitled paper ${index + 1}`);
  const publishedAt = isoOrDisplayDate(
    toStringValue(item.publishedAt ?? item.published_at ?? item.date, DEFAULT_LAST_UPDATED()),
  );
  const authors = toStringList(item.authors ?? item.authorNames ?? item.author_names);
  const tags = toStringList(item.tags ?? item.keywords ?? item.categories);
  const ratedBy = Array.isArray(item.ratedBy)
    ? item.ratedBy
        .filter(isRecord)
        .map(entry => ({
          userId: toStringValue(entry.userId, `user-${index + 1}`),
          rating: toNumberValue(entry.rating, 0),
        }))
        .filter(entry => entry.rating > 0)
    : undefined;

  return {
    id: toStringValue(item.id, titleToId(title, 'paper', index)),
    title,
    authors: authors.length > 0 ? authors : ['Unknown author'],
    source: toStringValue(item.source ?? item.repository ?? item.publisher, DEFAULT_SOURCE),
    date: formatDateLabel(publishedAt),
    publishedAt,
    tags: tags.length > 0 ? tags : ['General'],
    abstract: toStringValue(item.abstract ?? item.summary, 'No abstract provided.'),
    citations: toNumberValue(item.citations ?? item.citationCount),
    rating: toNumberValue(item.rating, ratedBy ? average(ratedBy.map(entry => entry.rating)) : 0),
    userRating: toNumberValue(item.userRating),
    views: toNumberValue(item.views, Math.max(25, toNumberValue(item.downloads, 0))),
    savesCount: toNumberValue(item.savesCount ?? item.saveCount ?? item.bookmarks),
    type: toStringValue(item.type ?? item.publicationType, 'Preprint'),
    comments: Array.isArray(item.comments)
      ? item.comments.filter(isRecord).map((comment, commentIndex) => ({
          id: toStringValue(comment.id, `comment-${index + 1}-${commentIndex + 1}`),
          userId: toStringValue(comment.userId, 'community'),
          userName: toStringValue(comment.userName, 'Research Community'),
          userImageUrl: toStringValue(comment.userImageUrl, `https://i.pravatar.cc/150?u=comment-${index}-${commentIndex}`),
          text: toStringValue(comment.text, ''),
          date: toStringValue(comment.date, 'Recently'),
          likes: toNumberValue(comment.likes),
        }))
      : [],
    citedBy: toStringList(item.citedBy),
    references: toStringList(item.references),
    savedBy: toStringList(item.savedBy),
    ratedBy,
    doi: toStringValue(item.doi),
    url: toStringValue(item.url ?? item.landingPageUrl),
    pdfUrl: toStringValue(item.pdfUrl ?? item.pdf_url),
  };
}

function normalizeUser(input: unknown, index: number): User {
  const item = isRecord(input) ? input : {};
  const name = toStringValue(item.name, `Researcher ${index + 1}`);
  const publications = toStringList(item.publications);
  const citations = toNumberValue(
    isRecord(item.stats) ? item.stats.citations : item.citations,
    publications.length * 12,
  );
  const followers = toNumberValue(
    isRecord(item.stats) ? item.stats.followers : item.followers,
    100 + index * 25,
  );

  return {
    id: toStringValue(item.id, titleToId(name, 'user', index)),
    name,
    email: toStringValue(item.email),
    isEmailVerified: Boolean(item.isEmailVerified),
    isAffiliationVerified: Boolean(item.isAffiliationVerified),
    affiliation: toStringValue(item.affiliation, 'Independent Researcher'),
    institutionId: toStringValue(item.institutionId),
    imageUrl: toStringValue(item.imageUrl, `https://i.pravatar.cc/150?u=${name}`),
    bio: toStringValue(item.bio, 'Researcher profile imported from an external dataset.'),
    publications,
    followers,
    following: toNumberValue(item.following, 40 + index * 5),
    isFollowing: Boolean(item.isFollowing),
    stats: {
      preprints: toNumberValue(isRecord(item.stats) ? item.stats.preprints : publications.length, publications.length),
      citations,
      followers,
      hIndex: toNumberValue(isRecord(item.stats) ? item.stats.hIndex : undefined, Math.max(1, Math.round(citations / 120))),
      i10Index: toNumberValue(isRecord(item.stats) ? item.stats.i10Index : undefined, Math.max(1, Math.round(citations / 250))),
      totalPublications: toNumberValue(
        isRecord(item.stats) ? item.stats.totalPublications : publications.length,
        publications.length,
      ),
    },
  };
}

function normalizeInstitution(input: unknown, index: number): Institution {
  const item = isRecord(input) ? input : {};
  const name = toStringValue(item.name, `Institution ${index + 1}`);
  return {
    id: toStringValue(item.id, titleToId(name, 'institution', index)),
    name,
    location: toStringValue(item.location, 'Location unavailable'),
    imageUrl: toStringValue(item.imageUrl, `https://picsum.photos/seed/institution-${index}/800/400`),
    description: toStringValue(item.description, `${name} is included in the imported research dataset.`),
    stats: {
      researchers: toNumberValue(isRecord(item.stats) ? item.stats.researchers : undefined, 25 + index * 10),
      publications: toNumberValue(isRecord(item.stats) ? item.stats.publications : undefined, 100 + index * 20),
      citations: toNumberValue(isRecord(item.stats) ? item.stats.citations : undefined, 500 + index * 40),
    },
  };
}

function normalizeCollection(input: unknown, index: number, preprints: Preprint[]): Collection {
  const item = isRecord(input) ? input : {};
  const name = toStringValue(item.name, `Collection ${index + 1}`);
  const preprintIds = toStringList(item.preprintIds);
  const collectionPapers = preprintIds.length > 0
    ? preprints.filter((preprint) => preprintIds.includes(preprint.id))
    : [];
  return {
    id: toStringValue(item.id, titleToId(name, 'collection', index)),
    name,
    description: toStringValue(item.description, 'Imported collection'),
    ownerId: toStringValue(item.ownerId),
    preprintIds,
    collaborators: toArray(item.collaborators)
      .map((entry) => {
        const collaborator = isRecord(entry) ? entry : {};
        const email = toStringValue(collaborator.email).toLowerCase();
        if (!email) {
          return null;
        }
        const role = toStringValue(collaborator.role, 'editor');
        return {
          email,
          role: role === 'viewer' ? 'viewer' as const : 'editor' as const,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
    sharedWith: toStringList(item.sharedWith),
    shareLinkToken: toStringValue(item.shareLinkToken),
    paperCount: toNumberValue(item.paperCount, collectionPapers.length),
    totalCitations: toNumberValue(
      item.totalCitations,
      collectionPapers.reduce((sum, preprint) => sum + (preprint.citations ?? 0), 0),
    ),
    updatedAt: toStringValue(item.updatedAt, 'Recently updated'),
    imageUrl: toStringValue(item.imageUrl, `https://picsum.photos/seed/collection-${index}/400/400`),
  };
}

function normalizeNotification(input: unknown, index: number): Notification {
  const item = isRecord(input) ? input : {};
  return {
    id: toStringValue(item.id, `notification-${index + 1}`),
    type: (toStringValue(item.type, 'feed') as Notification['type']),
    title: toStringValue(item.title, 'Imported update'),
    description: toStringValue(item.description, 'New activity is available in your dataset.'),
    time: toStringValue(item.time, 'Now'),
    isNew: Boolean(item.isNew),
  };
}

function normalizeFeed(input: unknown, index: number): CustomFeed {
  const item = isRecord(input) ? input : {};
  const sourceCategories = isRecord(item.sourceCategories)
    ? Object.fromEntries(
        Object.entries(item.sourceCategories)
          .map(([source, value]) => [source, toStringList(value)])
          .filter(([, categories]) => categories.length > 0),
      )
    : {};
  return {
    id: toStringValue(item.id, `feed-${index + 1}`),
    name: toStringValue(item.name, `Feed ${index + 1}`),
    keywords: toStringList(item.keywords),
    sources: toStringList(item.sources),
    sourceCategories,
    frequency: (toStringValue(item.frequency, 'Weekly') as CustomFeed['frequency']),
    isActive: item.isActive !== false,
  };
}

function normalizeChat(input: unknown, index: number): Chat {
  const item = isRecord(input) ? input : {};
  const messages = Array.isArray(item.messages)
    ? item.messages.filter(isRecord).map((message, messageIndex) => ({
        id: toStringValue(message.id, `message-${index + 1}-${messageIndex + 1}`),
        senderId: toStringValue(message.senderId, 'community'),
        text: toStringValue(message.text, ''),
        timestamp: toStringValue(message.timestamp, 'Now'),
      }))
    : [];
  return {
    id: toStringValue(item.id, `chat-${index + 1}`),
    participants: toStringList(item.participants),
    lastMessage: toStringValue(item.lastMessage, messages[messages.length - 1]?.text ?? ''),
    lastMessageTime: toStringValue(item.lastMessageTime, messages[messages.length - 1]?.timestamp ?? ''),
    unreadCount: toNumberValue(item.unreadCount),
    messages,
  };
}

function buildUsersFromPreprints(preprints: Preprint[], existingUsers: User[]): User[] {
  const byId = new Map(existingUsers.map(user => [user.id, user]));
  preprints.forEach((preprint, index) => {
    preprint.authors.forEach((author, authorIndex) => {
      const id = titleToId(author, 'user', index + authorIndex);
      if (!byId.has(id)) {
        byId.set(id, {
          id,
          name: author,
          affiliation: 'Independent Researcher',
          imageUrl: `https://i.pravatar.cc/150?u=${id}`,
          bio: `${author} appears in the imported paper catalog.`,
          publications: [preprint.id],
          followers: 100,
          following: 40,
          stats: {
            preprints: 1,
            citations: preprint.citations ?? 0,
            followers: 100,
            hIndex: 1,
            i10Index: 1,
            totalPublications: 1,
          },
        });
      } else {
        const current = byId.get(id)!;
        if (!current.publications.includes(preprint.id)) {
          current.publications = [...current.publications, preprint.id];
          current.stats.preprints = current.publications.length;
          current.stats.totalPublications = current.publications.length;
          current.stats.citations += preprint.citations ?? 0;
        }
      }
    });
  });
  return [...byId.values()];
}

function deriveCollections(preprints: Preprint[]): Collection[] {
  const tagMap = new Map<string, Preprint[]>();
  preprints.forEach(preprint => {
    preprint.tags.slice(0, 2).forEach(tag => {
      const current = tagMap.get(tag) ?? [];
      tagMap.set(tag, [...current, preprint]);
    });
  });

  return [...tagMap.entries()].slice(0, 4).map(([tag, papers], index) => ({
    id: titleToId(tag, 'collection', index),
    name: `${tag} Watchlist`,
    description: `Auto-generated collection for ${tag.toLowerCase()} papers.`,
    preprintIds: papers.map((paper) => paper.id),
    paperCount: papers.length,
    totalCitations: papers.reduce((sum, paper) => sum + (paper.citations ?? 0), 0),
    updatedAt: 'Synced from dataset',
    imageUrl: `https://picsum.photos/seed/${titleToId(tag, 'collection', index)}/400/400`,
  }));
}

function deriveNotifications(preprints: Preprint[]): Notification[] {
  return preprints.slice(0, 4).map((preprint, index) => ({
    id: `notification-derived-${index + 1}`,
    type: index % 2 === 0 ? 'feed' : 'citation',
    title: index % 2 === 0 ? `New paper: ${preprint.title}` : `${preprint.title} gained new attention`,
    description: `Source: ${preprint.source} • ${preprint.tags.join(', ')}`,
    time: index === 0 ? 'Now' : `${index + 1}h ago`,
    isNew: index < 2,
  }));
}

function deriveFeeds(preprints: Preprint[]): CustomFeed[] {
  const sourceNames = [...new Set(preprints.map(preprint => preprint.source))];
  const tagNames = [...new Set(preprints.flatMap(preprint => preprint.tags))];
  return tagNames.slice(0, 3).map((tag, index) => ({
    id: `feed-derived-${index + 1}`,
    name: `${tag} Monitor`,
    keywords: [tag],
    sources: sourceNames.slice(0, 3),
    sourceCategories: Object.fromEntries(sourceNames.slice(0, 3).map((source) => [source, [tag]])),
    frequency: index === 0 ? 'Daily' : 'Weekly',
    isActive: true,
  }));
}

function deriveTrendMetrics(preprints: Preprint[]): TrendMetric[] {
  const citations = preprints.map(preprint => preprint.citations ?? 0);
  const avgCitations = average(citations);
  const recentCount = preprints.filter(preprint => {
    const publishedAt = new Date(preprint.publishedAt ?? preprint.date);
    return !Number.isNaN(publishedAt.getTime()) && Date.now() - publishedAt.getTime() <= 90 * 24 * 60 * 60 * 1000;
  }).length;

  return [
    {
      label: 'Imported Papers',
      value: preprints.length.toLocaleString(),
      change: `${recentCount} recent`,
      icon: 'FileText',
      trend: 'up',
    },
    {
      label: 'Avg. Citations',
      value: avgCitations.toFixed(1),
      change: `${Math.round(avgCitations)} typical`,
      icon: 'Quote',
      trend: avgCitations > 0 ? 'up' : 'neutral',
    },
    {
      label: 'Tracked Sources',
      value: new Set(preprints.map(preprint => preprint.source)).size.toString(),
      change: `${new Set(preprints.flatMap(preprint => preprint.tags)).size} topics`,
      icon: 'TrendingUp',
      trend: 'neutral',
    },
  ];
}

function deriveRisingStars(users: User[]): RisingStar[] {
  return [...users]
    .sort((left, right) => right.stats.citations - left.stats.citations)
    .slice(0, 3)
    .map((user, index) => ({
      id: user.id,
      name: user.name,
      affiliation: user.affiliation,
      growth: `+${12 + index * 7}% cit.`,
      imageUrl: user.imageUrl,
    }));
}

function deriveDigestPapers(preprints: Preprint[]): DigestPaper[] {
  return [...preprints]
    .sort((left, right) => (right.citations ?? 0) - (left.citations ?? 0))
    .slice(0, 4)
    .map((preprint, index) => ({
      id: `digest-${preprint.id}`,
      topic: preprint.tags[0] ?? 'General',
      title: preprint.title,
      authors: preprint.authors.join(', '),
      source: preprint.source,
      imageUrl: `https://picsum.photos/seed/digest-${index}/800/400`,
    }));
}

function deriveDigestActivity(preprints: Preprint[]): DigestActivity[] {
  return preprints.slice(0, 2).map((preprint, index) => ({
    id: `activity-${index + 1}`,
    type: index === 0 ? 'citation' : 'collaborator',
    text: index === 0 ? 'Researchers are citing work related to' : 'A collaborator flagged new work in',
    highlight: `${preprint.tags[0] ?? 'your focus area'}.`,
  }));
}

function derivePublicationVolume(preprints: Preprint[]): PublicationVolumePoint[] {
  const counts = new Map<string, number>();
  preprints.forEach(preprint => {
    const date = new Date(preprint.publishedAt ?? preprint.date);
    const label = Number.isNaN(date.getTime())
      ? preprint.date
      : new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(date);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });

  return [...counts.entries()].slice(-5).map(([month, papers]) => ({ month, papers }));
}

function deriveWeeklyTrends(preprints: Preprint[]): WeeklyTrendPoint[] {
  const total = preprints.length || 1;
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => ({
    day,
    quantum: Math.max(5, Math.round((total * (index + 2)) / 4)),
    ai: Math.max(8, Math.round((total * (index + 3)) / 3)),
  }));
}

function hydrateDataset(partial: HydrateInput, metadata?: Partial<AppDataset['metadata']>): AppDataset {
  const preprints = (partial.preprints ?? []).map(normalizePreprint).sort((left, right) => {
    const leftTime = new Date(left.publishedAt ?? left.date).getTime();
    const rightTime = new Date(right.publishedAt ?? right.date).getTime();
    return rightTime - leftTime;
  });

  const baseUsers = (partial.users ?? []).map(normalizeUser);
  const users = buildUsersFromPreprints(preprints, baseUsers);
  const institutions = (partial.institutions ?? []).map(normalizeInstitution);

  return {
    preprints,
    collections: (partial.collections ?? deriveCollections(preprints)).map((collection, index) => normalizeCollection(collection, index, preprints)),
    notifications: (partial.notifications ?? deriveNotifications(preprints)).map(normalizeNotification),
    customFeeds: (partial.customFeeds ?? deriveFeeds(preprints)).map(normalizeFeed),
    trendMetrics: (partial.trendMetrics ?? deriveTrendMetrics(preprints)) as TrendMetric[],
    risingStars: (partial.risingStars ?? deriveRisingStars(users)) as RisingStar[],
    digestPapers: (partial.digestPapers ?? deriveDigestPapers(preprints)) as DigestPaper[],
    digestActivity: (partial.digestActivity ?? deriveDigestActivity(preprints)) as DigestActivity[],
    users,
    institutions,
    chats: (partial.chats ?? []).map(normalizeChat),
    publicationVolume: (partial.publicationVolume ?? derivePublicationVolume(preprints)) as PublicationVolumePoint[],
    weeklyTrends: (partial.weeklyTrends ?? deriveWeeklyTrends(preprints)) as WeeklyTrendPoint[],
    metadata: {
      sourceLabel: metadata?.sourceLabel ?? 'Seed dataset',
      isImported: metadata?.isImported ?? false,
      lastUpdated: metadata?.lastUpdated ?? DEFAULT_LAST_UPDATED(),
    },
  };
}

export function createSeedDataset(): AppDataset {
  return hydrateDataset(
    {
      preprints: MOCK_PREPRINTS,
      collections: MOCK_COLLECTIONS,
      notifications: MOCK_NOTIFICATIONS,
      customFeeds: MOCK_CUSTOM_FEEDS,
      trendMetrics: MOCK_TREND_METRICS,
      risingStars: MOCK_RISING_STARS,
      digestPapers: MOCK_DIGEST_PAPERS,
      digestActivity: MOCK_DIGEST_ACTIVITY,
      users: MOCK_USERS,
      institutions: MOCK_INSTITUTIONS,
      chats: MOCK_CHATS,
      publicationVolume: MOCK_PUBLICATION_VOLUME,
      weeklyTrends: MOCK_WEEKLY_TRENDS,
    },
    {
      sourceLabel: 'Seed dataset',
      isImported: false,
      lastUpdated: DEFAULT_LAST_UPDATED(),
    },
  );
}

export function loadAppDataset(): AppDataset {
  try {
    const raw = localStorage.getItem(DATASET_STORAGE_KEY);
    if (!raw) {
      return createSeedDataset();
    }
    const parsed = JSON.parse(raw) as LooseRecord & { metadata?: Partial<AppDataset['metadata']> };
    return hydrateDataset(parsed as HydrateInput, parsed.metadata);
  } catch (error) {
    console.error('Unable to load app dataset:', error);
    return createSeedDataset();
  }
}

export function saveAppDataset(dataset: AppDataset) {
  localStorage.setItem(DATASET_STORAGE_KEY, JSON.stringify(dataset));
}

export function resetAppDataset() {
  localStorage.removeItem(DATASET_STORAGE_KEY);
}

export function exportAppDataset(dataset: AppDataset): string {
  return JSON.stringify(dataset, null, 2);
}

export function importAppDataset(input: string): DatasetImportResult {
  const parsed = JSON.parse(input) as LooseRecord;
  const preprintSource = toArray(parsed.preprints ?? parsed.papers ?? parsed.items);
  if (preprintSource.length === 0) {
    throw new Error('Imported JSON must include a non-empty "preprints" or "papers" array.');
  }

  const warnings: string[] = [];
  if (!Array.isArray(parsed.users) && !Array.isArray(parsed.authors)) {
    warnings.push('No users array found. Researcher profiles were generated from paper authors.');
  }
  if (!Array.isArray(parsed.collections)) {
    warnings.push('No collections array found. Topic collections were generated from paper tags.');
  }
  if (!Array.isArray(parsed.institutions)) {
    warnings.push('No institutions array found. Institution pages will be limited to imported records.');
  }

  const dataset = hydrateDataset(
    {
      preprints: preprintSource,
      users: toArray(parsed.users ?? parsed.authors),
      institutions: toArray(parsed.institutions),
      collections: toArray(parsed.collections),
      notifications: toArray(parsed.notifications),
      customFeeds: toArray(parsed.customFeeds ?? parsed.feeds),
      chats: toArray(parsed.chats),
      digestPapers: toArray(parsed.digestPapers),
      digestActivity: toArray(parsed.digestActivity),
      trendMetrics: toArray(parsed.trendMetrics) as TrendMetric[],
      risingStars: toArray(parsed.risingStars) as RisingStar[],
      publicationVolume: toArray(parsed.publicationVolume) as PublicationVolumePoint[],
      weeklyTrends: toArray(parsed.weeklyTrends) as WeeklyTrendPoint[],
    },
    {
      sourceLabel: toStringValue(parsed.sourceLabel ?? parsed.name, 'Imported dataset'),
      isImported: true,
      lastUpdated: DEFAULT_LAST_UPDATED(),
    },
  );

  return { dataset, warnings };
}
