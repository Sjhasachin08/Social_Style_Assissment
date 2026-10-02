// database/schema.js
// Centralized table definitions. Called once on startup to ensure the
// SQLite schema exists. Safe to run multiple times (CREATE TABLE IF NOT EXISTS).

function columnExists(db, table, column) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  return cols.some((c) => c.name === column);
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL CHECK (role IN ('admin','user')) DEFAULT 'user',
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS questions (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      category        TEXT NOT NULL CHECK (category IN ('assertiveness','responsiveness')),
      question_number INTEGER NOT NULL,
      left_option     TEXT NOT NULL,
      right_option    TEXT NOT NULL,
      active          INTEGER NOT NULL DEFAULT 1,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Hindi translations of each option word, shown alongside the English
  // labels during the assessment so participants can read either language.
  if (!columnExists(db, 'questions', 'left_option_hi')) {
    db.exec(`ALTER TABLE questions ADD COLUMN left_option_hi TEXT NOT NULL DEFAULT '';`);
  }
  if (!columnExists(db, 'questions', 'right_option_hi')) {
    db.exec(`ALTER TABLE questions ADD COLUMN right_option_hi TEXT NOT NULL DEFAULT '';`);
  }

  // Short one-line examples clarifying what each option actually means in
  // plain, everyday terms — in English and Hindi — so a client taking the
  // assessment doesn't have to guess what a single trait word implies.
  for (const col of ['left_hint', 'right_hint', 'left_hint_hi', 'right_hint_hi']) {
    if (!columnExists(db, 'questions', col)) {
      db.exec(`ALTER TABLE questions ADD COLUMN ${col} TEXT NOT NULL DEFAULT '';`);
    }
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS assessments (
      id                      INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id                 INTEGER REFERENCES users(id) ON DELETE SET NULL,
      participant_name        TEXT NOT NULL,
      participant_email       TEXT NOT NULL,
      assertiveness_total     REAL NOT NULL,
      assertiveness_average   REAL NOT NULL,
      responsiveness_total    REAL NOT NULL,
      responsiveness_average  REAL NOT NULL,
      social_style            TEXT NOT NULL,
      created_at               TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Idempotent migration: older DB files created before accounts existed
  // won't have this column yet — add it if missing.
  if (!columnExists(db, 'assessments', 'user_id')) {
    db.exec(`ALTER TABLE assessments ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;`);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS assessment_answers (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      assessment_id  INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
      question_id    INTEGER NOT NULL REFERENCES questions(id),
      selected_score INTEGER NOT NULL CHECK (selected_score BETWEEN 1 AND 4)
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS social_styles (
      id                        INTEGER PRIMARY KEY AUTOINCREMENT,
      name                      TEXT NOT NULL UNIQUE,
      description               TEXT NOT NULL,
      strengths                 TEXT NOT NULL,
      challenges                TEXT NOT NULL,
      communication_style       TEXT NOT NULL,
      decision_style             TEXT NOT NULL,
      teamwork_style             TEXT NOT NULL,
      improvement_suggestions    TEXT NOT NULL
    );
  `);

  // Extended "comparative matrix" content (backup style under stress, what
  // they measure success by, etc.) plus a real-world example scenario —
  // gives the report the same depth as the reference behavioral styles guide.
  const styleColumns = [
    'backup_style',
    'measures_success_by',
    'growth_need',
    'present_benefit',
    'decision_input',
    'specialty',
    'climate_needed',
    'core_question',
    'example_scenario',
    'description_hi',
    'example_scenario_hi',
    'strengths_hi',
    'improvement_suggestions_hi'
  ];
  for (const col of styleColumns) {
    if (!columnExists(db, 'social_styles', col)) {
      db.exec(`ALTER TABLE social_styles ADD COLUMN ${col} TEXT NOT NULL DEFAULT '';`);
    }
  }

  db.exec(`CREATE INDEX IF NOT EXISTS idx_answers_assessment ON assessment_answers(assessment_id);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_assessments_user ON assessments(user_id);`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
}

module.exports = { initSchema };
