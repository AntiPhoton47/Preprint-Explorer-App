import { PREPRINTS, type IngestedPreprintRecord, getDbTimestamp } from './db';
import { contentStore } from './contentStore';
import { coreStore, type StoredSettings, type StoredUser } from './coreStore';
import { sendDigestEmail, type DeliveryResult } from './emailService';

type DigestKind = 'daily' | 'weekly';

type DigestPaper = {
  id: string;
  title: string;
  authors: string[];
  source: string;
  publishedAt: string;
  summary: string;
  categories: string[];
  url?: string;
};

type DigestRunSummary = {
  attempted: number;
  delivered: number;
  debugOnly: number;
  skipped: number;
};

function getDigestTimezone() {
  return process.env.DIGEST_TIMEZONE ?? 'UTC';
}

function getLocalDateKey(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: getDigestTimezone(),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function getLocalWeekday(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat('en-US', {
    timeZone: getDigestTimezone(),
    weekday: 'long',
  }).format(date);
}

function mapRecordToDigestPaper(record: IngestedPreprintRecord): DigestPaper {
  return {
    id: record.id,
    title: record.title,
    authors: JSON.parse(record.authors_json) as string[],
    source: record.source_name,
    publishedAt: record.published_at,
    summary: record.summary,
    categories: JSON.parse(record.categories_json) as string[],
    url: record.abs_url ?? record.pdf_url ?? undefined,
  };
}

function getCatalogDigestPapers(records: IngestedPreprintRecord[]) {
  if (records.length > 0) {
    return records.map(mapRecordToDigestPaper);
  }
  return PREPRINTS.map((preprint) => ({
    id: preprint.id,
    title: preprint.title,
    authors: preprint.authors,
    source: preprint.source,
    publishedAt: preprint.publishedAt ?? preprint.date,
    summary: preprint.abstract,
    categories: preprint.tags,
    url: preprint.url ?? preprint.pdfUrl,
  }));
}

function filterDigestPapers(kind: DigestKind, papers: DigestPaper[], asOf: Date) {
  const windowDays = kind === 'daily' ? 1 : 7;
  const threshold = asOf.getTime() - windowDays * 24 * 60 * 60 * 1000;
  const recent = papers.filter((paper) => new Date(paper.publishedAt).getTime() >= threshold);
  const pool = recent.length > 0 ? recent : papers;
  return [...pool]
    .sort((left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime())
    .slice(0, kind === 'daily' ? 5 : 8);
}

function buildDigestIntro(kind: DigestKind, papers: DigestPaper[]) {
  if (kind === 'daily') {
    return papers.length > 0
      ? `Here are the ${papers.length} most relevant papers from the last day in your Preprint Explorer feed.`
      : 'No new papers were found in the last day, so this digest includes the latest available highlights from your catalog.';
  }
  const uniqueSources = new Set(papers.map((paper) => paper.source)).size;
  return papers.length > 0
    ? `Your weekly digest covers ${papers.length} highlighted papers across ${uniqueSources} sources.`
    : 'No new weekly highlights were found, so this digest includes the latest available catalog selections.';
}

function buildDigestFooter(kind: DigestKind, user: StoredUser, settings: StoredSettings) {
  return kind === 'daily'
    ? `Sent to ${user.email}. Daily digest delivery is currently ${settings.daily_digest ? 'enabled' : 'disabled'} in your account settings.`
    : `Sent to ${user.email}. Weekly digest delivery is scheduled for ${settings.delivery_day}.`;
}

function shouldSendDigest(kind: DigestKind, settings: StoredSettings, asOf: Date) {
  if (!settings.email_enabled) {
    return false;
  }
  if (kind === 'daily') {
    if (!settings.daily_digest) {
      return false;
    }
    return getLocalDateKey(settings.last_daily_digest_sent_at ?? '') !== getLocalDateKey(asOf);
  }
  if (!settings.weekly_digest) {
    return false;
  }
  if (getLocalWeekday(asOf) !== settings.delivery_day) {
    return false;
  }
  return getLocalDateKey(settings.last_weekly_digest_sent_at ?? '') !== getLocalDateKey(asOf);
}

async function deliverDigest(user: StoredUser, settings: StoredSettings, kind: DigestKind, asOf: Date, markDelivered: boolean) {
  const catalog = await contentStore.listPreprints(200);
  const papers = filterDigestPapers(kind, getCatalogDigestPapers(catalog), asOf);
  const subject = kind === 'daily'
    ? `Your Preprint Explorer daily digest for ${getLocalDateKey(asOf)}`
    : `Your Preprint Explorer weekly digest for ${getLocalDateKey(asOf)}`;
  const delivery = await sendDigestEmail({
    to: user.email,
    subject,
    heading: kind === 'daily' ? 'Daily Research Digest' : 'Weekly Research Digest',
    intro: buildDigestIntro(kind, papers),
    highlights: papers.map((paper) => ({
      title: paper.title,
      meta: `${paper.source} • ${new Date(paper.publishedAt).toLocaleDateString()} • ${paper.authors.slice(0, 3).join(', ')}`,
      summary: paper.summary,
      url: paper.url,
    })),
    footer: buildDigestFooter(kind, user, settings),
  });
  if (markDelivered && delivery.delivered) {
    await coreStore.markDigestDelivered(user.id, kind, getDbTimestamp());
  }
  return {
    delivery,
    paperCount: papers.length,
    subject,
  };
}

export async function runDueDigests(asOf = new Date()): Promise<DigestRunSummary> {
  const users = await coreStore.listUsers();
  const summary: DigestRunSummary = {
    attempted: 0,
    delivered: 0,
    debugOnly: 0,
    skipped: 0,
  };

  for (const user of users) {
    if (!user.email) {
      summary.skipped += 1;
      continue;
    }
    const settings = await coreStore.findSettingsByUserId(user.id);
    if (!settings) {
      summary.skipped += 1;
      continue;
    }

    for (const kind of ['daily', 'weekly'] as const) {
      if (!shouldSendDigest(kind, settings, asOf)) {
        summary.skipped += 1;
        continue;
      }
      summary.attempted += 1;
      const result = await deliverDigest(user, settings, kind, asOf, true);
      if (result.delivery.delivered) {
        summary.delivered += 1;
      } else {
        summary.debugOnly += 1;
      }
    }
  }

  return summary;
}

export async function sendDigestNow(userId: string, kind: DigestKind) {
  const user = await coreStore.findUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  if (!user.email) {
    throw new Error('This account does not have an email address');
  }
  const settings = await coreStore.findSettingsByUserId(userId);
  if (!settings) {
    throw new Error('Settings not found for this account');
  }
  const result = await deliverDigest(user, settings, kind, new Date(), false);
  return {
    ...result,
    recipient: user.email,
  };
}
