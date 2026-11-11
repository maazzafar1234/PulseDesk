const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Determine which database to use
const USE_POSTGRESQL = !!process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgresql://');

let db = null;
let pool = null;
let SQL = null;

// PostgreSQL Setup
const initPostgres = async () => {
  const { Pool } = require('pg');

  // Create connection pool with SSL for production
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20, // Maximum connections in pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  // Test connection
  try {
    const client = await pool.connect();
    console.log('✓ PostgreSQL connected via RDS');
    client.release();
  } catch (err) {
    console.error('✗ PostgreSQL connection failed:', err.message);
    throw err;
  }

  // Create tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tickets (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'open',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for performance
  try {
    await pool.query('CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority)');
  } catch (e) {
    // Indexes might already exist
  }

  console.log('✓ PostgreSQL tables initialized');
  return pool;
};

// SQLite Setup (Fallback for local development)
const initSqlite = async () => {
  const initSqlJs = require('sql.js');

  SQL = await initSqlJs();

  // Ensure data directory exists
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'pulsedesk.db');

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Create indexes
  try {
    db.run('CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)');
    db.run('CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority)');
  } catch (e) {
    // Indexes might already exist
  }

  console.log(`✓ SQLite initialized at ${dbPath}`);
  saveDatabase();
  return db;
};

// Save SQLite database to file
const saveDatabase = () => {
  if (db && SQL) {
    const dataDir = path.join(__dirname, '..', 'data');
    const dbPath = path.join(dataDir, 'pulsedesk.db');
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
};

// Main initialization
const initialize = async () => {
  if (USE_POSTGRESQL) {
    return await initPostgres();
  } else {
    return await initSqlite();
  }
};

// Database interface - unified across both backends
module.exports = {
  async initialize() {
    if (!db && !pool) {
      await initialize();
    }
    return USE_POSTGRESQL ? pool : db;
  },

  getDb() {
    return USE_POSTGRESQL ? pool : db;
  },

  isPostgres() {
    return USE_POSTGRESQL;
  },

  // Execute query with unified interface
  async run(sql, params = []) {
    if (USE_POSTGRESQL) {
      if (!pool) throw new Error('Database not initialized');
      const normalizedSql = sql.replace(/\?/g, (match, offset) => {
        return `$${sql.substring(0, offset).split('?').length}`;
      });
      try {
        await pool.query(normalizedSql, params);
      } catch (err) {
        console.error('PostgreSQL query error:', err);
        throw err;
      }
    } else {
      if (!db) throw new Error('Database not initialized');
      db.run(sql, params);
      saveDatabase();
    }
  },

  exec(sql) {
    if (USE_POSTGRESQL) {
      throw new Error('Use query() method for PostgreSQL');
    }
    if (!db) throw new Error('Database not initialized');
    return db.exec(sql);
  },

  async get(sql, params = []) {
    if (USE_POSTGRESQL) {
      if (!pool) throw new Error('Database not initialized');
      const normalizedSql = sql.replace(/\?/g, (match, offset) => {
        return `$${sql.substring(0, offset).split('?').length}`;
      });
      try {
        const result = await pool.query(normalizedSql, params);
        return result.rows[0] || null;
      } catch (err) {
        console.error('PostgreSQL query error:', err);
        throw err;
      }
    } else {
      if (!db) throw new Error('Database not initialized');
      const stmt = db.prepare(sql);
      stmt.bind(params);
      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return row;
      }
      stmt.free();
      return null;
    }
  },

  async all(sql, params = []) {
    if (USE_POSTGRESQL) {
      if (!pool) throw new Error('Database not initialized');
      const normalizedSql = sql.replace(/\?/g, (match, offset) => {
        return `$${sql.substring(0, offset).split('?').length}`;
      });
      try {
        const result = await pool.query(normalizedSql, params);
        return result.rows;
      } catch (err) {
        console.error('PostgreSQL query error:', err);
        throw err;
      }
    } else {
      if (!db) throw new Error('Database not initialized');
      const stmt = db.prepare(sql);
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      return rows;
    }
  },

  save() {
    if (!USE_POSTGRESQL) {
      saveDatabase();
    }
  },

  async close() {
    if (USE_POSTGRESQL && pool) {
      await pool.end();
      console.log('PostgreSQL pool closed');
    }
  },
};
