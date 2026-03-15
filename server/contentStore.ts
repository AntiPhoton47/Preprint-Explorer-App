import crypto from 'node:crypto';
import { Pool } from 'pg';
import { db, getDbTimestamp, type IngestedPreprintRecord } from './db';

export type SyncRun = { id: string };

export type ContentPreprintInput = {
  sourceName: string;
  externalId: string;
  title: string;
  authors: string[];
  summary: string;
  publishedAt: string;
  updatedAt: string;
  categories: string[];
  doi?: string | null;
  absUrl?: string | null;
  pdfUrl?: string | null;
  rawJson?: string | null;
  syncRunId?: string | null;
};

export type ContentSyncDefinitionRecord = {
  id: string;
  source_name: string;
  query_text: string;
  max_results: number;
  interval_minutes: number;
  enabled: number;
  last_run_at: string | null;
  next_run_at: string | null;
  last_status: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

type CanonicalPaperRecord = {
  id: string;
  canonical_key: string;
  doi_normalized: string | null;
  title_normalized: string;
  primary_title: string;
  authors_json: string;
  summary: string;
  published_at: string;
  updated_at: string;
  categories_json: string;
  primary_source_name: string;
  abs_url: string | null;
  pdf_url: string | null;
  created_at: string;
  imported_at: string;
};

type ContentStore = {
  kind: 'sqlite' | 'postgres';
  init: () => Promise<void>;
  ping: () => Promise<void>;
  close: () => Promise<void>;
  createSyncRun: (sourceName: string, queryText: string) => Promise<SyncRun>;
  completeSyncRun: (id: string, status: 'succeeded' | 'failed', itemCount: number, errorMessage?: string) => Promise<void>;
  upsertPreprints: (preprints: ContentPreprintInput[]) => Promise<void>;
  listPreprints: (limit?: number) => Promise<IngestedPreprintRecord[]>;
  searchPreprints: (input: {
    query?: string;
    sources?: string[];
    categories?: string[];
    publicationType?: string;
    sortBy?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) => Promise<IngestedPreprintRecord[]>;
  listSyncDefinitions: () => Promise<ContentSyncDefinitionRecord[]>;
  upsertSyncDefinition: (input: {
    id?: string;
    sourceName: string;
    queryText: string;
    maxResults: number;
    intervalMinutes: number;
    enabled: boolean;
  }) => Promise<ContentSyncDefinitionRecord>;
  deleteSyncDefinition: (id: string) => Promise<void>;
  listDueSyncDefinitions: (asOf: string) => Promise<ContentSyncDefinitionRecord[]>;
  markSyncDefinitionRun: (input: {
    id: string;
    lastRunAt: string;
    nextRunAt: string;
    lastStatus: 'succeeded' | 'failed';
    lastError?: string | null;
  }) => Promise<void>;
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeTitle(value: string) {
  return normalizeWhitespace(value).toLowerCase().replace(/[^a-z0-9\s]/g, '');
}

function normalizeDoi(value?: string | null) {
  return value?.trim().toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, '') ?? null;
}

function normalizeAuthor(value?: string | null) {
  return normalizeWhitespace(value ?? '').toLowerCase().replace(/[^a-z0-9\s]/g, '');
}

function getCanonicalKey(preprint: ContentPreprintInput) {
  const normalizedDoi = normalizeDoi(preprint.doi);
  if (normalizedDoi) {
    return `doi:${normalizedDoi}`;
  }
  const year = new Date(preprint.publishedAt).getUTCFullYear() || 'unknown';
  const firstAuthor = normalizeAuthor(preprint.authors[0]);
  return `title:${normalizeTitle(preprint.title)}|author:${firstAuthor}|year:${year}`;
}

function computeNextRunAt(from: string, intervalMinutes: number) {
  return new Date(new Date(from).getTime() + intervalMinutes * 60 * 1000).toISOString();
}

function mapCanonicalToCatalogRecord(row: CanonicalPaperRecord): IngestedPreprintRecord {
  return {
    id: row.id,
    source_name: row.primary_source_name,
    external_id: row.canonical_key,
    title: row.primary_title,
    authors_json: row.authors_json,
    summary: row.summary,
    published_at: row.published_at,
    updated_at: row.updated_at,
    categories_json: row.categories_json,
    doi: row.doi_normalized,
    abs_url: row.abs_url,
    pdf_url: row.pdf_url,
    raw_json: null,
    sync_run_id: null,
    created_at: row.created_at,
    imported_at: row.imported_at,
    canonical_paper_id: row.id,
  };
}

function buildSearchWhereClause(input: {
  query?: string;
  sources?: string[];
  categories?: string[];
  startDate?: string;
  endDate?: string;
}, sqlFlavor: 'sqlite' | 'postgres') {
  const conditions: string[] = [];
  const values: Array<string | string[] | number> = [];
  const placeholder = () => (sqlFlavor === 'sqlite' ? '?' : `$${values.length}`);

  if (input.query?.trim()) {
    const lowered = `%${input.query.trim().toLowerCase()}%`;
    values.push(lowered);
    const queryParam = placeholder();
    conditions.push(`(
      lower(primary_title) LIKE ${queryParam}
      OR lower(summary) LIKE ${queryParam}
      OR lower(authors_json) LIKE ${queryParam}
      OR lower(categories_json) LIKE ${queryParam}
      OR lower(coalesce(doi_normalized, '')) LIKE ${queryParam}
    )`);
  }

  if (input.sources && input.sources.length > 0) {
    if (sqlFlavor === 'sqlite') {
      const placeholders = input.sources.map((source) => {
        values.push(source);
        return '?';
      });
      conditions.push(`primary_source_name IN (${placeholders.join(', ')})`);
    } else {
      values.push(input.sources);
      conditions.push(`primary_source_name = ANY($${values.length}::text[])`);
    }
  }

  if (input.categories && input.categories.length > 0) {
    const categoryChecks = input.categories.map((category) => {
      values.push(`%${category.toLowerCase()}%`);
      return `lower(categories_json) LIKE ${sqlFlavor === 'sqlite' ? '?' : `$${values.length}`}`;
    });
    conditions.push(`(${categoryChecks.join(' OR ')})`);
  }

  if (input.startDate) {
    values.push(input.startDate);
    conditions.push(`published_at >= ${sqlFlavor === 'sqlite' ? '?' : `$${values.length}`}`);
  }

  if (input.endDate) {
    values.push(input.endDate);
    conditions.push(`published_at <= ${sqlFlavor === 'sqlite' ? '?' : `$${values.length}`}`);
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    values,
  };
}

function createSqliteStore(): ContentStore {
  const upsertCanonicalPaper = (preprint: ContentPreprintInput, now: string) => {
    const canonicalKey = getCanonicalKey(preprint);
    const normalizedDoi = normalizeDoi(preprint.doi);
    const existing = db.prepare(`
      SELECT id, canonical_key, doi_normalized, title_normalized, primary_title, authors_json, summary, published_at,
             updated_at, categories_json, primary_source_name, abs_url, pdf_url, created_at, imported_at
      FROM canonical_papers
      WHERE canonical_key = ?
    `).get(canonicalKey) as CanonicalPaperRecord | undefined;
    const payload: CanonicalPaperRecord = {
      id: existing?.id ?? crypto.randomUUID(),
      canonical_key: canonicalKey,
      doi_normalized: normalizedDoi,
      title_normalized: normalizeTitle(preprint.title),
      primary_title: normalizeWhitespace(preprint.title),
      authors_json: JSON.stringify(preprint.authors),
      summary: normalizeWhitespace(preprint.summary),
      published_at: preprint.publishedAt,
      updated_at: preprint.updatedAt,
      categories_json: JSON.stringify(preprint.categories),
      primary_source_name: preprint.sourceName,
      abs_url: preprint.absUrl ?? null,
      pdf_url: preprint.pdfUrl ?? null,
      created_at: existing?.created_at ?? now,
      imported_at: now,
    };
    if (existing) {
      db.prepare(`
        UPDATE canonical_papers
        SET doi_normalized = ?,
            title_normalized = ?,
            primary_title = ?,
            authors_json = ?,
            summary = ?,
            published_at = ?,
            updated_at = ?,
            categories_json = ?,
            primary_source_name = ?,
            abs_url = ?,
            pdf_url = ?,
            imported_at = ?
        WHERE id = ?
      `).run(
        payload.doi_normalized,
        payload.title_normalized,
        payload.primary_title,
        payload.authors_json,
        payload.summary,
        payload.published_at,
        payload.updated_at,
        payload.categories_json,
        payload.primary_source_name,
        payload.abs_url,
        payload.pdf_url,
        payload.imported_at,
        payload.id,
      );
    } else {
      db.prepare(`
        INSERT INTO canonical_papers (
          id, canonical_key, doi_normalized, title_normalized, primary_title, authors_json, summary, published_at,
          updated_at, categories_json, primary_source_name, abs_url, pdf_url, created_at, imported_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        payload.id,
        payload.canonical_key,
        payload.doi_normalized,
        payload.title_normalized,
        payload.primary_title,
        payload.authors_json,
        payload.summary,
        payload.published_at,
        payload.updated_at,
        payload.categories_json,
        payload.primary_source_name,
        payload.abs_url,
        payload.pdf_url,
        payload.created_at,
        payload.imported_at,
      );
    }
    return payload.id;
  };

  return {
    kind: 'sqlite',
    ping: async () => {
      db.prepare('SELECT 1').get();
    },
    close: async () => {},
    init: async () => {},
    createSyncRun: async (sourceName, queryText) => {
      const id = crypto.randomUUID();
      db.prepare(`
        INSERT INTO content_sync_runs (id, source_name, query_text, status, item_count, started_at)
        VALUES (?, ?, ?, 'running', 0, ?)
      `).run(id, sourceName, queryText, getDbTimestamp());
      return { id };
    },
    completeSyncRun: async (id, status, itemCount, errorMessage) => {
      db.prepare(`
        UPDATE content_sync_runs
        SET status = ?, item_count = ?, error_message = ?, completed_at = ?
        WHERE id = ?
      `).run(status, itemCount, errorMessage ?? null, getDbTimestamp(), id);
    },
    upsertPreprints: async (preprints) => {
      const now = getDbTimestamp();
      const tx = db.transaction(() => {
        preprints.forEach((preprint) => {
          const canonicalPaperId = upsertCanonicalPaper(preprint, now);
          const existing = db.prepare('SELECT id, created_at FROM ingested_preprints WHERE source_name = ? AND external_id = ?')
            .get(preprint.sourceName, preprint.externalId) as { id: string; created_at: string } | undefined;
          db.prepare(`
            INSERT INTO ingested_preprints (
              id, canonical_paper_id, source_name, external_id, title, authors_json, summary, published_at, updated_at,
              categories_json, doi, abs_url, pdf_url, raw_json, sync_run_id, created_at, imported_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(source_name, external_id) DO UPDATE SET
              canonical_paper_id = excluded.canonical_paper_id,
              title = excluded.title,
              authors_json = excluded.authors_json,
              summary = excluded.summary,
              published_at = excluded.published_at,
              updated_at = excluded.updated_at,
              categories_json = excluded.categories_json,
              doi = excluded.doi,
              abs_url = excluded.abs_url,
              pdf_url = excluded.pdf_url,
              raw_json = excluded.raw_json,
              sync_run_id = excluded.sync_run_id,
              imported_at = excluded.imported_at
          `).run(
            existing?.id ?? crypto.randomUUID(),
            canonicalPaperId,
            preprint.sourceName,
            preprint.externalId,
            normalizeWhitespace(preprint.title),
            JSON.stringify(preprint.authors),
            normalizeWhitespace(preprint.summary),
            preprint.publishedAt,
            preprint.updatedAt,
            JSON.stringify(preprint.categories),
            normalizeDoi(preprint.doi),
            preprint.absUrl ?? null,
            preprint.pdfUrl ?? null,
            preprint.rawJson ?? null,
            preprint.syncRunId ?? null,
            existing?.created_at ?? now,
            now,
          );
        });
      });
      tx();
    },
    listPreprints: async (limit = 250) => {
      return db.prepare(`
        SELECT id, canonical_key, doi_normalized, title_normalized, primary_title, authors_json, summary,
               published_at, updated_at, categories_json, primary_source_name, abs_url, pdf_url, created_at, imported_at
        FROM canonical_papers
        ORDER BY published_at DESC, imported_at DESC
        LIMIT ?
      `).all(limit).map((row) => mapCanonicalToCatalogRecord(row as CanonicalPaperRecord));
    },
    searchPreprints: async ({ query, sources, categories, startDate, endDate, limit = 250 }) => {
      const built = buildSearchWhereClause({ query, sources, categories, startDate, endDate }, 'sqlite');
      const rows = db.prepare(`
        SELECT id, canonical_key, doi_normalized, title_normalized, primary_title, authors_json, summary,
               published_at, updated_at, categories_json, primary_source_name, abs_url, pdf_url, created_at, imported_at
        FROM canonical_papers
        ${built.whereClause}
        ORDER BY published_at DESC, imported_at DESC
        LIMIT ?
      `).all(...built.values, limit) as CanonicalPaperRecord[];
      return rows.map(mapCanonicalToCatalogRecord);
    },
    listSyncDefinitions: async () => {
      return db.prepare(`
        SELECT id, source_name, query_text, max_results, interval_minutes, enabled, last_run_at, next_run_at,
               last_status, last_error, created_at, updated_at
        FROM source_sync_definitions
        ORDER BY created_at DESC
      `).all() as ContentSyncDefinitionRecord[];
    },
    upsertSyncDefinition: async (input) => {
      const now = getDbTimestamp();
      const existing = input.id
        ? db.prepare('SELECT id, created_at FROM source_sync_definitions WHERE id = ?').get(input.id) as { id: string; created_at: string } | undefined
        : undefined;
      const id = existing?.id ?? crypto.randomUUID();
      const nextRunAt = input.enabled ? computeNextRunAt(now, input.intervalMinutes) : null;
      db.prepare(`
        INSERT INTO source_sync_definitions (
          id, source_name, query_text, max_results, interval_minutes, enabled, last_run_at, next_run_at,
          last_status, last_error, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, NULL, NULL, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          source_name = excluded.source_name,
          query_text = excluded.query_text,
          max_results = excluded.max_results,
          interval_minutes = excluded.interval_minutes,
          enabled = excluded.enabled,
          next_run_at = excluded.next_run_at,
          updated_at = excluded.updated_at
      `).run(
        id,
        input.sourceName,
        input.queryText,
        input.maxResults,
        input.intervalMinutes,
        input.enabled ? 1 : 0,
        nextRunAt,
        existing?.created_at ?? now,
        now,
      );
      return db.prepare(`
        SELECT id, source_name, query_text, max_results, interval_minutes, enabled, last_run_at, next_run_at,
               last_status, last_error, created_at, updated_at
        FROM source_sync_definitions
        WHERE id = ?
      `).get(id) as ContentSyncDefinitionRecord;
    },
    deleteSyncDefinition: async (id) => {
      db.prepare('DELETE FROM source_sync_definitions WHERE id = ?').run(id);
    },
    listDueSyncDefinitions: async (asOf) => {
      return db.prepare(`
        SELECT id, source_name, query_text, max_results, interval_minutes, enabled, last_run_at, next_run_at,
               last_status, last_error, created_at, updated_at
        FROM source_sync_definitions
        WHERE enabled = 1 AND next_run_at IS NOT NULL AND next_run_at <= ?
        ORDER BY next_run_at ASC
      `).all(asOf) as ContentSyncDefinitionRecord[];
    },
    markSyncDefinitionRun: async ({ id, lastRunAt, nextRunAt, lastStatus, lastError }) => {
      db.prepare(`
        UPDATE source_sync_definitions
        SET last_run_at = ?, next_run_at = ?, last_status = ?, last_error = ?, updated_at = ?
        WHERE id = ?
      `).run(lastRunAt, nextRunAt, lastStatus, lastError ?? null, getDbTimestamp(), id);
    },
  };
}

function createPostgresStore(databaseUrl: string): ContentStore {
  const pool = new Pool({ connectionString: databaseUrl });

  async function upsertCanonicalPaper(client: Pool | Pool['prototype'] | any, preprint: ContentPreprintInput) {
    const canonicalKey = getCanonicalKey(preprint);
    const now = getDbTimestamp();
    const result = await client.query<CanonicalPaperRecord>(`
      INSERT INTO canonical_papers (
        id, canonical_key, doi_normalized, title_normalized, primary_title, authors_json, summary,
        published_at, updated_at, categories_json, primary_source_name, abs_url, pdf_url, created_at, imported_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9::timestamptz, $10, $11, $12, $13, $14::timestamptz, $15::timestamptz
      )
      ON CONFLICT (canonical_key) DO UPDATE SET
        doi_normalized = EXCLUDED.doi_normalized,
        title_normalized = EXCLUDED.title_normalized,
        primary_title = EXCLUDED.primary_title,
        authors_json = EXCLUDED.authors_json,
        summary = EXCLUDED.summary,
        published_at = EXCLUDED.published_at,
        updated_at = EXCLUDED.updated_at,
        categories_json = EXCLUDED.categories_json,
        primary_source_name = EXCLUDED.primary_source_name,
        abs_url = EXCLUDED.abs_url,
        pdf_url = EXCLUDED.pdf_url,
        imported_at = EXCLUDED.imported_at
      RETURNING id
    `, [
      crypto.randomUUID(),
      canonicalKey,
      normalizeDoi(preprint.doi),
      normalizeTitle(preprint.title),
      normalizeWhitespace(preprint.title),
      JSON.stringify(preprint.authors),
      normalizeWhitespace(preprint.summary),
      preprint.publishedAt,
      preprint.updatedAt,
      JSON.stringify(preprint.categories),
      preprint.sourceName,
      preprint.absUrl ?? null,
      preprint.pdfUrl ?? null,
      now,
      now,
    ]);
    return result.rows[0].id;
  }

  return {
    kind: 'postgres',
    ping: async () => {
      await pool.query('SELECT 1');
    },
    close: async () => {
      await pool.end();
    },
    init: async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS content_sync_runs (
          id TEXT PRIMARY KEY,
          source_name TEXT NOT NULL,
          query_text TEXT NOT NULL,
          status TEXT NOT NULL,
          item_count INTEGER NOT NULL DEFAULT 0,
          error_message TEXT,
          started_at TIMESTAMPTZ NOT NULL,
          completed_at TIMESTAMPTZ
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS canonical_papers (
          id TEXT PRIMARY KEY,
          canonical_key TEXT NOT NULL UNIQUE,
          doi_normalized TEXT,
          title_normalized TEXT NOT NULL,
          primary_title TEXT NOT NULL,
          authors_json TEXT NOT NULL,
          summary TEXT NOT NULL,
          published_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL,
          categories_json TEXT NOT NULL,
          primary_source_name TEXT NOT NULL,
          abs_url TEXT,
          pdf_url TEXT,
          created_at TIMESTAMPTZ NOT NULL,
          imported_at TIMESTAMPTZ NOT NULL
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS ingested_preprints (
          id TEXT PRIMARY KEY,
          canonical_paper_id TEXT REFERENCES canonical_papers(id) ON DELETE SET NULL,
          source_name TEXT NOT NULL,
          external_id TEXT NOT NULL,
          title TEXT NOT NULL,
          authors_json TEXT NOT NULL,
          summary TEXT NOT NULL,
          published_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL,
          categories_json TEXT NOT NULL,
          doi TEXT,
          abs_url TEXT,
          pdf_url TEXT,
          raw_json TEXT,
          sync_run_id TEXT REFERENCES content_sync_runs(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ NOT NULL,
          imported_at TIMESTAMPTZ NOT NULL,
          UNIQUE (source_name, external_id)
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS source_sync_definitions (
          id TEXT PRIMARY KEY,
          source_name TEXT NOT NULL,
          query_text TEXT NOT NULL,
          max_results INTEGER NOT NULL,
          interval_minutes INTEGER NOT NULL,
          enabled INTEGER NOT NULL DEFAULT 1,
          last_run_at TIMESTAMPTZ,
          next_run_at TIMESTAMPTZ,
          last_status TEXT,
          last_error TEXT,
          created_at TIMESTAMPTZ NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL
        );
      `);
      await pool.query('CREATE INDEX IF NOT EXISTS idx_ingested_preprints_source_name ON ingested_preprints(source_name)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_ingested_preprints_canonical ON ingested_preprints(canonical_paper_id)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_canonical_papers_published_at ON canonical_papers(published_at DESC)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_content_sync_runs_started_at ON content_sync_runs(started_at DESC)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_source_sync_definitions_due ON source_sync_definitions(enabled, next_run_at)');
    },
    createSyncRun: async (sourceName, queryText) => {
      const id = crypto.randomUUID();
      await pool.query(`
        INSERT INTO content_sync_runs (id, source_name, query_text, status, item_count, started_at)
        VALUES ($1, $2, $3, 'running', 0, NOW())
      `, [id, sourceName, queryText]);
      return { id };
    },
    completeSyncRun: async (id, status, itemCount, errorMessage) => {
      await pool.query(`
        UPDATE content_sync_runs
        SET status = $2, item_count = $3, error_message = $4, completed_at = NOW()
        WHERE id = $1
      `, [id, status, itemCount, errorMessage ?? null]);
    },
    upsertPreprints: async (preprints) => {
      const client = await pool.connect();
      const now = getDbTimestamp();
      try {
        await client.query('BEGIN');
        for (const preprint of preprints) {
          const canonicalPaperId = await upsertCanonicalPaper(client, preprint);
          await client.query(`
            INSERT INTO ingested_preprints (
              id, canonical_paper_id, source_name, external_id, title, authors_json, summary, published_at, updated_at,
              categories_json, doi, abs_url, pdf_url, raw_json, sync_run_id, created_at, imported_at
            ) VALUES (
              COALESCE((SELECT id FROM ingested_preprints WHERE source_name = $3 AND external_id = $4), $1),
              $2, $3, $4, $5, $6, $7, $8::timestamptz, $9::timestamptz, $10, $11, $12, $13, $14, $15,
              COALESCE((SELECT created_at FROM ingested_preprints WHERE source_name = $3 AND external_id = $4), $16::timestamptz),
              $16::timestamptz
            )
            ON CONFLICT (source_name, external_id) DO UPDATE SET
              canonical_paper_id = EXCLUDED.canonical_paper_id,
              title = EXCLUDED.title,
              authors_json = EXCLUDED.authors_json,
              summary = EXCLUDED.summary,
              published_at = EXCLUDED.published_at,
              updated_at = EXCLUDED.updated_at,
              categories_json = EXCLUDED.categories_json,
              doi = EXCLUDED.doi,
              abs_url = EXCLUDED.abs_url,
              pdf_url = EXCLUDED.pdf_url,
              raw_json = EXCLUDED.raw_json,
              sync_run_id = EXCLUDED.sync_run_id,
              imported_at = EXCLUDED.imported_at
          `, [
            crypto.randomUUID(),
            canonicalPaperId,
            preprint.sourceName,
            preprint.externalId,
            normalizeWhitespace(preprint.title),
            JSON.stringify(preprint.authors),
            normalizeWhitespace(preprint.summary),
            preprint.publishedAt,
            preprint.updatedAt,
            JSON.stringify(preprint.categories),
            normalizeDoi(preprint.doi),
            preprint.absUrl ?? null,
            preprint.pdfUrl ?? null,
            preprint.rawJson ?? null,
            preprint.syncRunId ?? null,
            now,
          ]);
        }
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    },
    listPreprints: async (limit = 250) => {
      const result = await pool.query<CanonicalPaperRecord>(`
        SELECT id, canonical_key, doi_normalized, title_normalized, primary_title, authors_json, summary,
               published_at::text, updated_at::text, categories_json, primary_source_name, abs_url, pdf_url,
               created_at::text, imported_at::text
        FROM canonical_papers
        ORDER BY published_at DESC, imported_at DESC
        LIMIT $1
      `, [limit]);
      return result.rows.map(mapCanonicalToCatalogRecord);
    },
    searchPreprints: async ({ query, sources, categories, startDate, endDate, limit = 250 }) => {
      const built = buildSearchWhereClause({ query, sources, categories, startDate, endDate }, 'postgres');
      built.values.push(limit);
      const result = await pool.query<CanonicalPaperRecord>(`
        SELECT id, canonical_key, doi_normalized, title_normalized, primary_title, authors_json, summary,
               published_at::text, updated_at::text, categories_json, primary_source_name, abs_url, pdf_url,
               created_at::text, imported_at::text
        FROM canonical_papers
        ${built.whereClause}
        ORDER BY published_at DESC, imported_at DESC
        LIMIT $${built.values.length}
      `, built.values);
      return result.rows.map(mapCanonicalToCatalogRecord);
    },
    listSyncDefinitions: async () => {
      const result = await pool.query<ContentSyncDefinitionRecord>(`
        SELECT id, source_name, query_text, max_results, interval_minutes, enabled,
               last_run_at::text, next_run_at::text, last_status, last_error, created_at::text, updated_at::text
        FROM source_sync_definitions
        ORDER BY created_at DESC
      `);
      return result.rows;
    },
    upsertSyncDefinition: async (input) => {
      const now = getDbTimestamp();
      const nextRunAt = input.enabled ? computeNextRunAt(now, input.intervalMinutes) : null;
      const result = await pool.query<ContentSyncDefinitionRecord>(`
        INSERT INTO source_sync_definitions (
          id, source_name, query_text, max_results, interval_minutes, enabled, last_run_at, next_run_at,
          last_status, last_error, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NULL, $7::timestamptz, NULL, NULL, $8::timestamptz, $9::timestamptz)
        ON CONFLICT (id) DO UPDATE SET
          source_name = EXCLUDED.source_name,
          query_text = EXCLUDED.query_text,
          max_results = EXCLUDED.max_results,
          interval_minutes = EXCLUDED.interval_minutes,
          enabled = EXCLUDED.enabled,
          next_run_at = EXCLUDED.next_run_at,
          updated_at = EXCLUDED.updated_at
        RETURNING id, source_name, query_text, max_results, interval_minutes, enabled,
                  last_run_at::text, next_run_at::text, last_status, last_error, created_at::text, updated_at::text
      `, [
        input.id ?? crypto.randomUUID(),
        input.sourceName,
        input.queryText,
        input.maxResults,
        input.intervalMinutes,
        input.enabled ? 1 : 0,
        nextRunAt,
        now,
        now,
      ]);
      return result.rows[0];
    },
    deleteSyncDefinition: async (id) => {
      await pool.query('DELETE FROM source_sync_definitions WHERE id = $1', [id]);
    },
    listDueSyncDefinitions: async (asOf) => {
      const result = await pool.query<ContentSyncDefinitionRecord>(`
        SELECT id, source_name, query_text, max_results, interval_minutes, enabled,
               last_run_at::text, next_run_at::text, last_status, last_error, created_at::text, updated_at::text
        FROM source_sync_definitions
        WHERE enabled = 1 AND next_run_at IS NOT NULL AND next_run_at <= $1::timestamptz
        ORDER BY next_run_at ASC
      `, [asOf]);
      return result.rows;
    },
    markSyncDefinitionRun: async ({ id, lastRunAt, nextRunAt, lastStatus, lastError }) => {
      await pool.query(`
        UPDATE source_sync_definitions
        SET last_run_at = $2::timestamptz, next_run_at = $3::timestamptz, last_status = $4, last_error = $5, updated_at = NOW()
        WHERE id = $1
      `, [id, lastRunAt, nextRunAt, lastStatus, lastError ?? null]);
    },
  };
}

export const contentStore = process.env.DATABASE_URL
  ? createPostgresStore(process.env.DATABASE_URL)
  : createSqliteStore();

export type { ContentStore };
