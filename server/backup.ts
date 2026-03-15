import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Pool } from 'pg';
import { getDatabasePath } from './db';

const tables = [
  'users',
  'user_settings',
  'follows',
  'chats',
  'chat_participants',
  'messages',
  'preprint_shares',
  'notifications',
  'moderation_reports',
  'moderation_actions',
  'blocked_users',
  'sessions',
  'trusted_devices',
  'security_events',
  'two_factor_credentials',
  'passkeys',
  'login_challenges',
  'webauthn_challenges',
  'email_verification_tokens',
  'password_reset_tokens',
  'ingested_preprints',
  'sync_runs',
] as const;

async function backupPostgres(databaseUrl: string, targetPath: string) {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const snapshot: Record<string, unknown> = {
      createdAt: new Date().toISOString(),
      store: 'postgres',
      tables: {},
    };
    for (const table of tables) {
      const existsResult = await pool.query<{ exists: boolean }>(
        `SELECT EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = $1
        ) AS exists`,
        [table],
      );
      if (!existsResult.rows[0]?.exists) {
        continue;
      }
      const result = await pool.query(`SELECT * FROM ${table}`);
      snapshot.tables[table] = result.rows;
    }
    fs.writeFileSync(targetPath, JSON.stringify(snapshot, null, 2));
  } finally {
    await pool.end();
  }
}

async function uploadBackup(targetPath: string) {
  const uploadProvider = process.env.BACKUP_UPLOAD_PROVIDER ?? 'generic-webhook';
  const uploadUrl = process.env.BACKUP_UPLOAD_URL;
  if (uploadProvider === 's3') {
    const bucket = process.env.BACKUP_S3_BUCKET;
    const region = process.env.BACKUP_S3_REGION ?? 'us-east-1';
    const endpoint = process.env.BACKUP_S3_ENDPOINT;
    const prefix = process.env.BACKUP_S3_PREFIX ?? 'preprint-explorer';
    if (!bucket) {
      throw new Error('BACKUP_S3_BUCKET is required for s3 backup uploads');
    }
    const client = new S3Client({
      region,
      endpoint: endpoint || undefined,
      forcePathStyle: process.env.BACKUP_S3_FORCE_PATH_STYLE === '1',
      credentials: process.env.BACKUP_S3_ACCESS_KEY_ID && process.env.BACKUP_S3_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.BACKUP_S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.BACKUP_S3_SECRET_ACCESS_KEY,
          }
        : undefined,
    });
    const fileName = path.basename(targetPath);
    const key = `${prefix.replace(/\/$/, '')}/${fileName}`;
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fs.readFileSync(targetPath),
      ContentType: 'application/json',
    }));
    return;
  }

  if (!uploadUrl) {
    return;
  }

  const method = process.env.BACKUP_UPLOAD_METHOD ?? 'PUT';
  const bearerToken = process.env.BACKUP_UPLOAD_BEARER_TOKEN;
  const fileName = path.basename(targetPath);
  const body = fs.readFileSync(targetPath);

  const response = await fetch(uploadUrl, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Backup-File': fileName,
      ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`Backup upload failed with status ${response.status}`);
  }
}

function backupSqlite(targetPath: string) {
  const source = new Database(getDatabasePath(), { readonly: true });
  try {
    const snapshot: Record<string, unknown> = {
      createdAt: new Date().toISOString(),
      store: 'sqlite',
      tables: {},
    };
    for (const table of tables) {
      const exists = source.prepare(`
        SELECT 1
        FROM sqlite_master
        WHERE type = 'table' AND name = ?
      `).get(table);
      if (!exists) {
        continue;
      }
      snapshot.tables[table] = source.prepare(`SELECT * FROM ${table}`).all();
    }
    fs.writeFileSync(targetPath, JSON.stringify(snapshot, null, 2));
  } finally {
    source.close();
  }
}

async function main() {
  const backupDir = path.resolve(process.cwd(), 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const retentionCount = Math.max(1, Number(process.env.BACKUP_RETENTION_COUNT ?? '10'));
  const fileName = `preprint-explorer-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const targetPath = path.join(backupDir, fileName);

  if (process.env.DATABASE_URL && process.env.ENABLE_POSTGRES_APP_STORE === '1') {
    await backupPostgres(process.env.DATABASE_URL, targetPath);
  } else {
    backupSqlite(targetPath);
  }

  const backups = fs.readdirSync(backupDir)
    .filter((entry) => entry.startsWith('preprint-explorer-backup-') && entry.endsWith('.json'))
    .sort()
    .reverse();
  backups.slice(retentionCount).forEach((entry) => {
    fs.rmSync(path.join(backupDir, entry));
  });

  await uploadBackup(targetPath);

  console.log(`Backup written to ${targetPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
