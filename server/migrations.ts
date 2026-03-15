import fs from 'node:fs';
import path from 'node:path';
import type Database from 'better-sqlite3';

const migrationsDir = path.resolve(process.cwd(), 'server', 'migrations');

type MigrationFile = {
  version: string;
  name: string;
  sql: string;
};

function getMigrationFiles(): MigrationFile[] {
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  return fs.readdirSync(migrationsDir)
    .filter(fileName => fileName.endsWith('.sql'))
    .sort()
    .map((fileName) => ({
      version: fileName.replace(/\.sql$/, ''),
      name: fileName,
      sql: fs.readFileSync(path.join(migrationsDir, fileName), 'utf8'),
    }));
}

export function applyMigrations(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = new Set(
    (db.prepare('SELECT version FROM schema_migrations ORDER BY version').all() as Array<{ version: string }>)
      .map((row) => row.version),
  );

  const insertApplied = db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)');

  for (const migration of getMigrationFiles()) {
    if (applied.has(migration.version)) {
      continue;
    }

    const tx = db.transaction(() => {
      db.exec(migration.sql);
      insertApplied.run(migration.version, new Date().toISOString());
    });
    tx();
  }
}
