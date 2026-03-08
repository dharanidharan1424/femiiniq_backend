const mysql = require("mysql2/promise");
const dotenv = require("dotenv");
dotenv.config();

const DB_CONFIG = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 30000,
  connectTimeout: 30000,
  charset: "utf8mb4",
};

const RETRYABLE_ERRORS = [
  "PROTOCOL_CONNECTION_LOST",
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "ER_SERVER_SHUTDOWN",
];

// Longer delays so a sleeping free-tier DB server has time to wake up
const RETRY_DELAYS = [2000, 6000, 12000];

let pool = mysql.createPool(DB_CONFIG);

async function recreatePool() {
  console.warn("[DB] Recreating connection pool...");
  try { await pool.end(); } catch (_) { /* ignore errors on broken pool teardown */ }
  pool = mysql.createPool(DB_CONFIG);
  console.log("[DB] Connection pool recreated.");
}

async function queryWithRetry(fn) {
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (RETRYABLE_ERRORS.includes(err.code) && attempt < RETRY_DELAYS.length) {
        const delay = RETRY_DELAYS[attempt];
        console.warn(`⚠️ DB connection error (${err.code}), retrying in ${delay}ms... (attempt ${attempt + 1}/${RETRY_DELAYS.length})`);
        await new Promise(r => setTimeout(r, delay));
        await recreatePool();
      } else {
        throw err;
      }
    }
  }
}

const resilientPool = {
  query: (...args) => queryWithRetry(() => pool.query(...args)),
  execute: (...args) => queryWithRetry(() => pool.execute(...args)),
  getConnection: () => pool.getConnection(),
  end: () => pool.end(),
};

// Startup warmup: silently retry until DB is reachable (non-blocking)
async function warmupConnection() {
  const maxWait = 60000;
  const interval = 3000;
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    try {
      const conn = await pool.getConnection();
      console.log("✅ Database connection successful!");
      conn.release();
      return;
    } catch (err) {
      console.warn(`⚠️ DB not ready yet (${err.code}), retrying in ${interval / 1000}s...`);
      await new Promise(r => setTimeout(r, interval));
      await recreatePool();
    }
  }
  console.error("❌ Could not connect to DB after 60s. Queries will retry on demand.");
}
warmupConnection();

module.exports = resilientPool;

