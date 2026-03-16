import type { ContentPreprintInput } from './contentStore';
import { fetchArxivPreprintsByAuthor } from './sources/arxiv';

type OrcidExternalId = {
  'external-id-type'?: string;
  'external-id-value'?: string;
};

type OrcidWorkSummary = {
  'put-code'?: number;
  title?: {
    title?: {
      value?: string;
    } | null;
  } | null;
  'external-ids'?: {
    'external-id'?: OrcidExternalId[];
  } | null;
  url?: {
    value?: string;
  } | null;
  type?: string | null;
  'publication-date'?: {
    year?: { value?: string } | null;
    month?: { value?: string } | null;
    day?: { value?: string } | null;
  } | null;
  'journal-title'?: {
    value?: string;
  } | null;
  path?: string;
};

type OrcidWorksPayload = {
  group?: Array<{
    'work-summary'?: OrcidWorkSummary[];
  }>;
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function buildOrcidPublicationDate(summary: OrcidWorkSummary) {
  const year = Number(summary['publication-date']?.year?.value ?? '');
  const month = Number(summary['publication-date']?.month?.value ?? '1');
  const day = Number(summary['publication-date']?.day?.value ?? '1');
  if (!year) {
    return new Date().toISOString();
  }
  return new Date(Date.UTC(year, Math.max(0, month - 1), Math.max(1, day))).toISOString();
}

function getOrcidExternalId(summary: OrcidWorkSummary, type: string) {
  const entries = summary['external-ids']?.['external-id'] ?? [];
  return entries.find((entry) => entry['external-id-type']?.toLowerCase() === type)?.['external-id-value']?.trim() ?? null;
}

function mapOrcidWorkSummary(summary: OrcidWorkSummary, orcidId: string, authorName: string): Omit<ContentPreprintInput, 'syncRunId'> | null {
  const title = normalizeWhitespace(summary.title?.title?.value ?? '');
  if (!title) {
    return null;
  }

  const doi = getOrcidExternalId(summary, 'doi');
  const arxivId = getOrcidExternalId(summary, 'arxiv');
  const journalTitle = normalizeWhitespace(summary['journal-title']?.value ?? '');
  const publishedAt = buildOrcidPublicationDate(summary);
  const fallbackUrl = summary.path ? `https://orcid.org${summary.path}` : null;
  const absUrl = summary.url?.value?.trim()
    || (doi ? `https://doi.org/${doi}` : null)
    || (arxivId ? `https://arxiv.org/abs/${arxivId}` : null)
    || fallbackUrl;
  const pdfUrl = arxivId ? `https://arxiv.org/pdf/${arxivId}.pdf` : null;
  const workType = summary.type?.trim() || 'research-output';
  const summaryText = journalTitle
    ? `${journalTitle}. Imported from ORCID public record.`
    : 'Imported from ORCID public record.';

  return {
    sourceName: 'ORCID',
    externalId: doi || arxivId || `orcid:${orcidId}:work:${summary['put-code'] ?? title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    title,
    authors: [authorName],
    summary: summaryText,
    publishedAt,
    updatedAt: publishedAt,
    categories: [workType],
    doi,
    absUrl,
    pdfUrl,
    rawJson: JSON.stringify(summary),
  };
}

function normalizeOrcidId(value: string) {
  return value.trim().replace(/^https?:\/\/orcid\.org\//i, '');
}

export async function fetchOrcidWorks(orcidId: string, authorName: string, maxResults: number) {
  const normalizedId = normalizeOrcidId(orcidId);
  const response = await fetch(`https://pub.orcid.org/v3.0/${normalizedId}/works`, {
    headers: {
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Unable to fetch ORCID publications');
  }
  const payload = await response.json() as OrcidWorksPayload;
  return (payload.group ?? [])
    .flatMap((group) => group['work-summary'] ?? [])
    .map((summary) => mapOrcidWorkSummary(summary, normalizedId, authorName))
    .filter((item): item is Omit<ContentPreprintInput, 'syncRunId'> => Boolean(item))
    .slice(0, maxResults);
}

export async function fetchProfilePublicationsFromSource(input: {
  source: 'orcid' | 'arxiv';
  authorName: string;
  orcidId?: string;
  maxResults: number;
}) {
  if (input.source === 'arxiv') {
    return fetchArxivPreprintsByAuthor(input.authorName, input.maxResults);
  }
  if (!input.orcidId) {
    throw new Error('ORCID iD is required for ORCID imports');
  }
  return fetchOrcidWorks(input.orcidId, input.authorName, input.maxResults);
}
