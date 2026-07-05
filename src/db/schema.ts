export const CREATE_USERS_TABLE = `
CREATE TABLE IF NOT EXISTS users (
  telegram_id INTEGER PRIMARY KEY,
  username TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  settings_json TEXT NOT NULL DEFAULT '{}'
)
`;

export const CREATE_WALLETS_TABLE = `
CREATE TABLE IF NOT EXISTS wallets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id INTEGER NOT NULL,
  public_key TEXT NOT NULL,
  encrypted_private_key TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT 'Main',
  is_active INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE
)
`;

export const CREATE_TRANSACTIONS_TABLE = `
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  telegram_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('SOL_SEND','TOKEN_SEND','SWAP')),
  signature TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','failed')),
  amount TEXT,
  token_mint TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (telegram_id) REFERENCES users(telegram_id) ON DELETE CASCADE
)
`;

export const CREATE_SESSIONS_TABLE = `
CREATE TABLE IF NOT EXISTS sessions (
  telegram_id INTEGER PRIMARY KEY,
  data TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)
`;

export const ALL_TABLES = [
  CREATE_USERS_TABLE,
  CREATE_WALLETS_TABLE,
  CREATE_TRANSACTIONS_TABLE,
  CREATE_SESSIONS_TABLE,
];
