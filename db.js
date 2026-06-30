const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');

let db;
const isProduction = process.env.DATABASE_URL ? true : false;

if (isProduction) {
  console.log("⚡ Connecting to Supabase Cloud Database (PostgreSQL)...");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  // Smart translation function to make SQLite queries compatible with PostgreSQL
  const convertPlaceholders = (sql) => {
    let converted = sql;
    // 1. Translate AUTOINCREMENT to SERIAL for table creations
    converted = converted.replace(/INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT/ig, 'SERIAL PRIMARY KEY');
    // 2. Translate DateTime SQLite functions to PostgreSQL compatible ones
    converted = converted.replace(/datetime\('now'\)/ig, 'CURRENT_TIMESTAMP');
    converted = converted.replace(/strftime\('%Y-%m-%d'\s*,\s*'now'\)/ig, 'CURRENT_DATE');
    // 3. Convert SQLite "?" to PostgreSQL "$1, $2, etc"
    let index = 1;
    return converted.replace(/\?/g, () => `$${index++}`);
  };

  // Build an emulator/wrapper to match SQLite db methods exactly in server.js
  db = {
    all: (sql, params, callback) => {
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      pool.query(convertPlaceholders(sql), params || [], (err, res) => {
        if (err) return callback ? callback(err) : console.error(err);
        if (callback) callback(null, res.rows);
      });
    },
    get: (sql, params, callback) => {
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      pool.query(convertPlaceholders(sql), params || [], (err, res) => {
        if (err) return callback ? callback(err) : console.error(err);
        if (callback) callback(null, res.rows[0]);
      });
    },
    run: function (sql, params, callback) {
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      let finalSql = convertPlaceholders(sql);

      // Automatically append RETURNING id to INSERT queries in Postgres to fetch lastID
      const isInsert = /insert\s+into/i.test(finalSql);
      if (isInsert && !/returning/i.test(finalSql)) {
        finalSql = finalSql.trim().replace(/;?$/, ' RETURNING id');
      }

      pool.query(finalSql, params || [], (err, res) => {
        if (err) {
          if (callback) callback(err);
          return;
        }

        // Emulate SQLite's callback context (this.lastID and this.changes)
        const lastID = res.rows && res.rows[0] ? res.rows[0].id : null;
        const context = {
          lastID: lastID,
          changes: res.rowCount
        };

        if (callback) {
          callback.call(context, null);
        }
      });
    },
    serialize: (callback) => {
      // Postgres pool manages execution context automatically, so we just run the callback
      callback();
    }
  };
} else {
  console.log("💻 Local Development: Connecting to SQLite...");
  const dbPath = path.resolve(__dirname, 'database.sqlite');
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error("Error opening SQLite database:", err.message);
  });
}


// Initialize database tables and seed data
db.initDatabase = function() {
  db.serialize(() => {
    // 1. Services
    db.run(`CREATE TABLE IF NOT EXISTS services (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT,
        price TEXT,
        icon TEXT,
        active INTEGER DEFAULT 1,
        skills TEXT
    )`);

    // 2. Courses
    db.run(`CREATE TABLE IF NOT EXISTS courses (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        instructor TEXT,
        level TEXT,
        duration TEXT,
        price TEXT,
        active INTEGER DEFAULT 1,
        category TEXT,
        enrolledStudents INTEGER DEFAULT 0,
        lessons TEXT
    )`);

    // 3. Forum Posts
    db.run(`CREATE TABLE IF NOT EXISTS forum_posts (
        id TEXT PRIMARY KEY,
        author TEXT,
        role TEXT,
        avatar TEXT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        likes INTEGER DEFAULT 0,
        tags TEXT,
        date TEXT
    )`);

    // 4. Forum Replies
    db.run(`CREATE TABLE IF NOT EXISTS forum_replies (
        id TEXT PRIMARY KEY,
        post_id TEXT,
        author TEXT,
        role TEXT,
        avatar TEXT,
        content TEXT NOT NULL,
        FOREIGN KEY (post_id) REFERENCES forum_posts(id)
    )`);

    // 5. Users
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )`, (err) => {
        if (!err) {
            const bcrypt = require('bcrypt');
            bcrypt.hash('admin123', 10, (err, hash) => {
                let insertSql = "INSERT INTO users (username, password) VALUES (?, ?) ON CONFLICT (username) DO NOTHING";
                if (!isProduction) {
                     insertSql = "INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)";
                }
                db.run(insertSql, ['admin', hash]);
            });
        }
    });

    // 6. Portfolio
    db.run(`CREATE TABLE IF NOT EXISTS portfolio (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT,
        status TEXT,
        link TEXT,
        image TEXT,
        active INTEGER DEFAULT 1
    )`);

    // 7. Portfolio Stats
    db.run(`CREATE TABLE IF NOT EXISTS portfolio_stats (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        value TEXT NOT NULL,
        icon TEXT
    )`);
  });
};

module.exports = db;
