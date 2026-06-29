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

module.exports = db;
