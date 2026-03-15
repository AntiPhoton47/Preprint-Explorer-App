import type { ContentSourceAdapter } from './types';

type BioRxivItem = {
  doi?: string;
  title?: string;
  authors?: string;
  date?: string;
  version?: string;
  type?: string;
  category?: string;
  jatsxml?: string;
  abstract?: string;
  published?: string;
  server?: string;
};

type BioRxivResponse = {
  collection?: BioRxivItem[];
};

function normalizeBioRxivAuthors(value?: string) {
  return (value ?? '')
    .split(/;\s*|\s+and\s+/)
    .map((author) => author.trim())
    .filter(Boolean);
}

function buildBioRxivSource(serverId: 'biorxiv' | 'medrxiv', label: string, description: string): ContentSourceAdapter {
  return {
    id: serverId,
    label,
    description,
    async fetch({ query, maxResults }) {
      const response = await fetch(`https://api.biorxiv.org/details/${serverId}/45d`, {
        headers: {
          accept: 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`Unable to fetch ${label} results`);
      }
      const payload = await response.json() as BioRxivResponse;
      const normalizedQuery = query.trim().toLowerCase();
      const matches = (payload.collection ?? []).filter((item) => {
        const haystack = [
          item.title,
          item.authors,
          item.abstract,
          item.category,
          item.doi,
          item.type,
        ].join(' ').toLowerCase();
        return haystack.includes(normalizedQuery);
      }).slice(0, maxResults);

      return matches.map((item) => {
        const publishedAt = item.date ? new Date(item.date).toISOString() : new Date().toISOString();
        const abstract = (item.abstract ?? '').replace(/\s+/g, ' ').trim();
        const version = item.version ? `v${item.version}` : undefined;
        const doi = item.doi ?? null;
        const absUrl = doi ? `https://www.${serverId}.org/content/${doi}${version ?? ''}` : null;
        const pdfUrl = doi ? `https://www.${serverId}.org/content/${doi}${version ?? ''}.full.pdf` : null;
        return {
          sourceName: label,
          externalId: doi ?? `${serverId}:${item.title ?? publishedAt}`,
          title: item.title?.trim() || `Untitled ${label} preprint`,
          authors: normalizeBioRxivAuthors(item.authors),
          summary: abstract || `No abstract provided by ${label}.`,
          publishedAt,
          updatedAt: publishedAt,
          categories: [item.category ?? item.type ?? label].filter(Boolean),
          doi,
          absUrl,
          pdfUrl,
          rawJson: JSON.stringify(item),
        };
      });
    },
  };
}

export const biorxivSource = buildBioRxivSource(
  'biorxiv',
  'bioRxiv',
  'Life sciences preprints from bioRxiv.',
);

export const medrxivSource = buildBioRxivSource(
  'medrxiv',
  'medRxiv',
  'Health sciences and clinical preprints from medRxiv.',
);
