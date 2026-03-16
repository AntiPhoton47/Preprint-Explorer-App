import { XMLParser } from 'fast-xml-parser';
import type { ContentSourceAdapter } from './types';

type ArxivLink = {
  href?: string;
  rel?: string;
  type?: string;
  title?: string;
};

type ArxivAuthor = {
  name: string;
};

type ArxivCategory = {
  term: string;
};

type ArxivEntry = {
  id: string;
  title: string;
  summary: string;
  published: string;
  updated: string;
  author?: ArxivAuthor | ArxivAuthor[];
  category?: ArxivCategory | ArxivCategory[];
  link?: ArxivLink | ArxivLink[];
  'arxiv:doi'?: string;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  allowBooleanAttributes: true,
});

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

async function fetchArxivEntries(searchQuery: string, maxResults: number) {
  const searchParams = new URLSearchParams({
    search_query: searchQuery,
    start: '0',
    max_results: String(maxResults),
    sortBy: 'lastUpdatedDate',
    sortOrder: 'descending',
  });
  const response = await fetch(`https://export.arxiv.org/api/query?${searchParams.toString()}`);
  if (!response.ok) {
    throw new Error('Unable to fetch arXiv results');
  }
  const xml = await response.text();
  const parsed = parser.parse(xml) as { feed?: { entry?: ArxivEntry[] | ArxivEntry } };
  return asArray(parsed.feed?.entry).map((entry) => {
    const links = asArray(entry.link);
    const pdfLink = links.find((link) => link.title === 'pdf' || link.type === 'application/pdf');
    const absLink = links.find((link) => link.rel === 'alternate') ?? links[0];
    return {
      sourceName: 'arXiv',
      externalId: entry.id,
      title: entry.title.replace(/\s+/g, ' ').trim(),
      authors: asArray(entry.author).map((author) => author.name).filter(Boolean),
      summary: entry.summary.replace(/\s+/g, ' ').trim(),
      publishedAt: entry.published,
      updatedAt: entry.updated,
      categories: asArray(entry.category).map((category) => category.term).filter(Boolean),
      doi: entry['arxiv:doi'] ?? null,
      absUrl: absLink?.href ?? entry.id,
      pdfUrl: pdfLink?.href ?? null,
      rawJson: JSON.stringify(entry),
    };
  });
}

export async function fetchArxivPreprintsByAuthor(authorName: string, maxResults: number) {
  return fetchArxivEntries(`au:"${authorName}"`, maxResults);
}

export const arxivSource: ContentSourceAdapter = {
  id: 'arxiv',
  label: 'arXiv',
  description: 'Physics, math, CS, quantitative biology, and related open preprints.',
  async fetch({ query, maxResults }) {
    return fetchArxivEntries(`all:${query}`, maxResults);
  },
};
