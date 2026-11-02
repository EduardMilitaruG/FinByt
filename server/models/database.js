import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// DB_PATH=:memory: gives each test run a fresh database
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'portfolio.db');

const db = new Database(dbPath);

// Enable foreign keys and WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create users table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    createdAt TEXT DEFAULT (datetime('now'))
  )
`);

// Create assets table with userId foreign key
db.exec(`
  CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    assetName TEXT NOT NULL,
    symbol TEXT NOT NULL,
    assetType TEXT NOT NULL CHECK(assetType IN ('crypto', 'stock', 'etf')),
    quantity REAL NOT NULL CHECK(quantity > 0),
    buyPrice REAL NOT NULL CHECK(buyPrice >= 0),
    currentPrice REAL DEFAULT 0,
    notes TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Create index on userId for faster queries
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_assets_userId ON assets(userId)
`);

export default db;
