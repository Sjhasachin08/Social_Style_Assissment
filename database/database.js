// database/database.js
// Creates the /database directory and social_style.db file automatically
// if they do not exist, applies the schema, and seeds default content.
// No configuration, host, username, or password required.
//
// Uses Node's built-in `node:sqlite` module (available in Node 22.5+) instead
// of a native npm package, so there is nothing to compile — no Visual Studio
// Build Tools, no Python, no node-gyp required on any platform.

const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const { initSchema } = require('./schema');
const { seedAll } = require('./seed');

const DB_DIR = path.join(__dirname, '..', 'database');
const DB_PATH = path.join(DB_DIR, 'social_style.db');

let dbInstance = null;

function getDb() {
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  initSchema(db);
  seedAll(db);

  dbInstance = db;
  return dbInstance;
}

/**
 * node:sqlite's DatabaseSync has no built-in `.transaction()` helper
 * (unlike better-sqlite3), so this small wrapper provides the same
 * "run this function atomically" convenience used throughout the app.
 */
function runInTransaction(db, fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

module.exports = { getDb, DB_PATH, runInTransaction };
