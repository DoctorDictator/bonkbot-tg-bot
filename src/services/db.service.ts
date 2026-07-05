import { Database } from 'bun:sqlite';
import { runMigrations } from '../db/migrations';
import type { WalletData, TransactionRecord, UserSettings } from '../types';

const DB_PATH = 'data/bonkbot.db';

let instance: DbService | null = null;

export class DbService {
  private db: Database;

  private constructor() {
    this.db = new Database(DB_PATH);
    runMigrations(this.db);
  }

  static getInstance(): DbService {
    if (!instance) instance = new DbService();
    return instance;
  }

  getDb(): Database {
    return this.db;
  }

  // --- Users ---

  getUser(telegramId: number): { telegramId: number; username: string | null; createdAt: string; settingsJson: string } | null {
    const row = this.db.query('SELECT telegram_id, username, created_at, settings_json FROM users WHERE telegram_id = ?').get(telegramId) as any;
    if (!row) return null;
    return {
      telegramId: row.telegram_id,
      username: row.username,
      createdAt: row.created_at,
      settingsJson: row.settings_json,
    };
  }

  createUser(telegramId: number, username?: string): void {
    this.db.query('INSERT OR IGNORE INTO users (telegram_id, username) VALUES (?, ?)').run(telegramId, username ?? null);
  }

  updateUsername(telegramId: number, username: string): void {
    this.db.query('UPDATE users SET username = ? WHERE telegram_id = ?').run(username, telegramId);
  }

  getUserSettings(telegramId: number): UserSettings {
    const row = this.db.query('SELECT settings_json FROM users WHERE telegram_id = ?').get(telegramId) as any;
    if (!row) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(row.settings_json) };
  }

  updateUserSettings(telegramId: number, settings: Partial<UserSettings>): void {
    const current = this.getUserSettings(telegramId);
    const merged = { ...current, ...settings };
    this.db.query('UPDATE users SET settings_json = ? WHERE telegram_id = ?').run(JSON.stringify(merged), telegramId);
  }

  // --- Wallets ---

  getWallets(telegramId: number): WalletData[] {
    const rows = this.db.query('SELECT id, telegram_id, public_key, encrypted_private_key, label, is_active, created_at FROM wallets WHERE telegram_id = ? ORDER BY created_at ASC').all(telegramId) as any[];
    return rows.map(mapWallet);
  }

  getActiveWallet(telegramId: number): WalletData | null {
    const row = this.db.query('SELECT id, telegram_id, public_key, encrypted_private_key, label, is_active, created_at FROM wallets WHERE telegram_id = ? AND is_active = 1 LIMIT 1').get(telegramId) as any;
    if (!row) {
      const first = this.db.query('SELECT id, telegram_id, public_key, encrypted_private_key, label, is_active, created_at FROM wallets WHERE telegram_id = ? ORDER BY created_at ASC LIMIT 1').get(telegramId) as any;
      return first ? mapWallet(first) : null;
    }
    return mapWallet(row);
  }

  createWallet(telegramId: number, publicKey: string, encryptedPrivateKey: string, label: string = 'Main'): void {
    const hasWallet = this.db.query('SELECT COUNT(*) as count FROM wallets WHERE telegram_id = ?').get(telegramId) as any;
    const isActive = hasWallet.count === 0 ? 1 : 0;
    this.db.query('INSERT INTO wallets (telegram_id, public_key, encrypted_private_key, label, is_active) VALUES (?, ?, ?, ?, ?)').run(telegramId, publicKey, encryptedPrivateKey, label, isActive);
  }

  setActiveWallet(telegramId: number, walletId: number): void {
    this.db.query('UPDATE wallets SET is_active = 0 WHERE telegram_id = ?').run(telegramId);
    this.db.query('UPDATE wallets SET is_active = 1 WHERE id = ? AND telegram_id = ?').run(walletId, telegramId);
  }

  deleteWallet(walletId: number): void {
    this.db.query('DELETE FROM wallets WHERE id = ?').run(walletId);
  }

  // --- Transactions ---

  createTransaction(telegramId: number, type: string, signature: string, status: string, amount?: string, tokenMint?: string | null): void {
    this.db.query('INSERT INTO transactions (telegram_id, type, signature, status, amount, token_mint) VALUES (?, ?, ?, ?, ?, ?)').run(telegramId, type, signature, status, amount ?? null, tokenMint ?? null);
  }

  getTransactions(telegramId: number, limit: number = 20): TransactionRecord[] {
    const rows = this.db.query('SELECT id, telegram_id, type, signature, status, amount, token_mint, created_at FROM transactions WHERE telegram_id = ? ORDER BY created_at DESC LIMIT ?').all(telegramId, limit) as any[];
    return rows.map(mapTransaction);
  }

  updateTransactionStatus(id: number, status: string): void {
    this.db.query('UPDATE transactions SET status = ? WHERE id = ?').run(status, id);
  }
}

const DEFAULT_SETTINGS: UserSettings = {
  slippageBps: 100,
  priorityFee: 'medium',
  customPriorityFeeLamports: 0,
  notificationsEnabled: true,
};

function mapWallet(row: any): WalletData {
  return {
    id: row.id,
    telegramId: row.telegram_id,
    publicKey: row.public_key,
    encryptedPrivateKey: row.encrypted_private_key,
    label: row.label,
    isActive: !!row.is_active,
    createdAt: row.created_at,
  };
}

function mapTransaction(row: any): TransactionRecord {
  return {
    id: row.id,
    telegramId: row.telegram_id,
    type: row.type,
    signature: row.signature,
    status: row.status,
    amount: row.amount,
    tokenMint: row.token_mint,
    createdAt: row.created_at,
  };
}
