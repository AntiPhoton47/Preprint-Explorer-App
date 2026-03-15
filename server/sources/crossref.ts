import crypto from 'node:crypto';
import type { ContentSourceAdapter } from './types';

type CrossrefAuthor = {
  given?: string;
  family?: string;
  name?: string;
};

type CrossrefItem = {
  DOI?: string;
  title?: string[];
  abstract?: string;
  published?: { 'date-parts'?: number[][] };
  issued?: { 'date-parts'?: number[][] };
  created?: { 'date-time'?: string };
  author?: CrossrefAuthor[];
  subject?: string[];
  URL?: string;
  type?: string;
};

function formatCrossrefDate(item: CrossrefItem) {
  const dateParts = item.published?.['date-parts']?.[0]
    ?? item.issued?.['date-parts']?.[0];
  if (dateParts && dateParts.length > 0) {
    const [year, month = 1, day = 1] = dateParts;
    return new Date(Date.UTC(year, month - 1, day)).toISOString();
  }
  return item.created?.['date-time'] ?? new Date().toISOString();
}

export const crossrefSource: ContentSourceAdapter = {
  id: 'crossref',
  label: 'Crossref',
  description: 'Broad DOI-based scholarly metadata across journals, articles, and related works.',
  async fetch({ query, maxResults }) {
    const searchParams = new URLSearchParams({
      query,
      rows: String(maxResults),
      sort: 'published',
      order: 'desc',
      select: 'DOI,title,abstract,published,issued,created,author,subject,URL,type',
    });
    const response = await fetch(`https://api.crossref.org/works?${searchParams.toString()}`, {
      headers: {
        'user-agent': 'PreprintExplorer/1.0 (mailto:support@preprint-explorer.local)',
      },
    });
    if (!response.ok) {
      throw new Error('Unable to fetch Crossref results');
    }
    const payload = await response.json() as { message?: { items?: CrossrefItem[] } };
    return (payload.message?.items ?? []).map((item) => {
      const publishedAt = formatCrossrefDate(item);
      const abstract = (item.abstract ?? '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const authors = (item.author ?? [])
        .map((author) => author.name ?? [author.given, author.family].filter(Boolean).join(' ').trim())
        .filter(Boolean);
      return {
        sourceName: 'Crossref',
        externalId: item.DOI ?? item.URL ?? crypto.randomUUID(),
        title: item.title?.[0]?.trim() || 'Untitled Crossref work',
        authors,
        summary: abstract || 'No abstract provided by Crossref.',
        publishedAt,
        updatedAt: publishedAt,
        categories: item.subject ?? [item.type ?? 'research-article'],
        doi: item.DOI ?? null,
        absUrl: item.URL ?? (item.DOI ? `https://doi.org/${item.DOI}` : null),
        pdfUrl: null,
        rawJson: JSON.stringify(item),
      };
    });
  },
};
