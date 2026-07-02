/**
 * Database Initialization
 * 
 * Creates all tables and seeds the default admin account.
 * Uses better-sqlite3 for synchronous, fast SQLite operations.
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'remuneration.db');
let db;

/**
 * Get the database instance (singleton)
 */
function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

/**
 * Initialize database schema and seed data
 */
function initDatabase() {
  const db = getDb();

  // ── Admins table ────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL DEFAULT 'Administrator',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── Remuneration Claims table ───────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS remuneration_claims (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      claim_number TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

      /* Staff Details */
      staff_name TEXT NOT NULL,
      staff_id TEXT NOT NULL,
      department TEXT NOT NULL,
      designation TEXT NOT NULL,
      bank_name TEXT,
      bank_branch TEXT,
      account_number TEXT,
      ifsc_code TEXT,
      mobile_number TEXT,
      passbook_file TEXT,
      staff_section_enabled INTEGER DEFAULT 1,

      /* Question Paper Setting */
      qp_section_enabled INTEGER DEFAULT 0,
      qp_type TEXT,
      qp_quantity INTEGER DEFAULT 0,
      qp_rate REAL DEFAULT 0,
      qp_amount REAL DEFAULT 0,

      /* Paper Scrutiny */
      scrutiny_quantity INTEGER DEFAULT 0,
      scrutiny_rate REAL DEFAULT 300,
      scrutiny_amount REAL DEFAULT 0,

      /* Script Evaluation */
      eval_appointment TEXT,
      eval_phase TEXT,
      eval_date TEXT,
      eval_scripts INTEGER DEFAULT 0,
      eval_rate REAL DEFAULT 30,
      eval_amount REAL DEFAULT 0,

      /* Squad Duty */
      squad_days INTEGER DEFAULT 0,
      squad_session TEXT,
      squad_rate REAL DEFAULT 0,
      squad_amount REAL DEFAULT 0,

      /* Totals */
      grand_total REAL DEFAULT 0,
      amount_in_words TEXT
    )
  `);

  // ── Audit Log table ─────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      claim_id INTEGER,
      claim_number TEXT,
      action TEXT NOT NULL,
      admin_id INTEGER,
      admin_name TEXT,
      changes TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (claim_id) REFERENCES remuneration_claims(id) ON DELETE SET NULL,
      FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL
    )
  `);

  // ── Drafts table (auto-save) ────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT UNIQUE NOT NULL,
      form_data TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── Indexes ─────────────────────────────────────────────────────
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_claims_staff_id ON remuneration_claims(staff_id);
    CREATE INDEX IF NOT EXISTS idx_claims_department ON remuneration_claims(department);
    CREATE INDEX IF NOT EXISTS idx_claims_created_at ON remuneration_claims(created_at);
    CREATE INDEX IF NOT EXISTS idx_claims_claim_number ON remuneration_claims(claim_number);
    CREATE INDEX IF NOT EXISTS idx_audit_claim_id ON audit_log(claim_id);
    CREATE INDEX IF NOT EXISTS idx_drafts_session ON drafts(session_id);
  `);

  // ── Seed default admin ──────────────────────────────────────────
  const adminExists = db.prepare('SELECT id FROM admins WHERE username = ?').get('admin');
  if (!adminExists) {
    const passwordHash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 12);
    db.prepare('INSERT INTO admins (username, password_hash, full_name) VALUES (?, ?, ?)').run(
      process.env.ADMIN_USERNAME || 'admin',
      passwordHash,
      'System Administrator'
    );
    console.log('   ➜ Default admin account created');
  }

  // ── Migrations ──────────────────────────────────────────────────
  try {
    db.exec(`ALTER TABLE remuneration_claims ADD COLUMN bank_name TEXT`);
    db.exec(`ALTER TABLE remuneration_claims ADD COLUMN bank_branch TEXT`);
    db.exec(`ALTER TABLE remuneration_claims ADD COLUMN account_number TEXT`);
    db.exec(`ALTER TABLE remuneration_claims ADD COLUMN ifsc_code TEXT`);
    db.exec(`ALTER TABLE remuneration_claims ADD COLUMN mobile_number TEXT`);
    db.exec(`ALTER TABLE remuneration_claims ADD COLUMN passbook_file TEXT`);
    console.log('   ➜ Applied database migration: Added bank details columns and passbook_file');
  } catch (e) {
    // Columns likely already exist, safe to ignore
  }

  return db;
}

module.exports = { getDb, initDatabase };
