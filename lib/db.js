import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

sqlite3.verbose();

let db; // sqlite3.Database instance
let initializingPromise = null;

// Basic schema for initial persistence. Additional tables (moderation, etc.) can be layered later.
const SCHEMA_STATEMENTS = [
  'PRAGMA journal_mode = WAL;',
  'PRAGMA foreign_keys = ON;',
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    is_admin BOOLEAN DEFAULT 0,
    email_verified BOOLEAN DEFAULT 0,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    media_url TEXT,
    media_type TEXT,
    like_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, user_id),
    FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );`,
  'CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);',
  'CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);',
  'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);',
  'CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);',
  'CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);',
  'CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);',
  'CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);',
  'CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);'
];

export const initDB = async () => {
  if (db) return db; // Already initialized
  if (initializingPromise) return initializingPromise;

  initializingPromise = new Promise((resolve, reject) => {
    try {
      const dbFile = path.join(process.cwd(), 'nexus_social.db');
      // Ensure file exists (sqlite will create if missing, but we can ensure directory)
      const dir = path.dirname(dbFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const instance = new sqlite3.Database(dbFile, (err) => {
        if (err) return reject(err);

        instance.serialize(() => {
          try {
            for (const stmt of SCHEMA_STATEMENTS) {
              instance.run(stmt, (sErr) => {
                if (sErr) console.error('Schema statement failed:', sErr.message, '\nSQL:', stmt);
              });
            }
          } catch (schemaErr) {
            return reject(schemaErr);
          }
        });

        db = instance;
        resolve(db);
      });
    } catch (outerErr) {
      reject(outerErr);
    }
  });

  return initializingPromise;
};

const ensureDB = async () => {
  if (!db) await initDB();
  return db;
};

export const query = async (sql, params = []) => {
  const database = await ensureDB();
  return new Promise((resolve, reject) => {
    database.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
};

export const run = async (sql, params = []) => {
  const database = await ensureDB();
  return new Promise((resolve, reject) => {
    database.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

export const close = async () => {
  if (!db) return;
  await new Promise((resolve, reject) => {
    db.close((err) => (err ? reject(err) : resolve()));
  });
  db = null;
  initializingPromise = null;
};
