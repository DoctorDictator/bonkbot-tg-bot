import { Database } from 'bun:sqlite';
import { ALL_TABLES } from './schema';

export function runMigrations(db: Database): void {
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');

  for (const sql of ALL_TABLES) {
    db.exec(sql);
  }

  console.log('[DB] Migrations complete');
}
