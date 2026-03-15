import { arxivSource } from './arxiv';
import { biorxivSource, medrxivSource } from './biorxiv';
import { crossrefSource } from './crossref';
import type { ContentSourceAdapter } from './types';

export const contentSources: ContentSourceAdapter[] = [
  arxivSource,
  crossrefSource,
  biorxivSource,
  medrxivSource,
];

export function getContentSource(sourceId: string) {
  return contentSources.find((source) => source.id === sourceId);
}
