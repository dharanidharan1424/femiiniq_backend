const mysql = require("mysql2/promise");
const dotenv = require("dotenv");
const path = require("path");

// Load env from root
dotenv.config({ path: path.join(__dirname, "../../.env") });

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

// Exponential backoff delays: 500ms, 1.5s, 3s
const RETRY_DELAYS = [500, 1500, 3000];

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
                console.warn(`[DB] Connection error (${err.code}), retrying in ${delay}ms... (attempt ${attempt + 1}/${RETRY_DELAYS.length})`);
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

module.exports = resilientPool;
