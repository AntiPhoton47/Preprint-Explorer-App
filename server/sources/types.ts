import type { ContentPreprintInput } from '../contentStore';

export type SourceFetchInput = {
  query: string;
  maxResults: number;
};

export type ContentSourceAdapter = {
  id: string;
  label: string;
  description: string;
  fetch: (input: SourceFetchInput) => Promise<Omit<ContentPreprintInput, 'syncRunId'>[]>;
};
