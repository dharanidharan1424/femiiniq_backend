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

let pool = mysql.createPool(DB_CONFIG);

// Recreates the pool — called when the entire pool is broken (all connections dead)
async function recreatePool() {
    console.warn("[DB] Recreating connection pool...");
    try {
        await pool.end(); // Drain and close all existing connections
    } catch (_) {
        // Ignore errors during teardown of a broken pool
    }
    pool = mysql.createPool(DB_CONFIG);
    console.log("[DB] Connection pool recreated.");
}

const resilientPool = {
    async query(sql, values) {
        try {
            return await pool.query(sql, values);
        } catch (err) {
            if (RETRYABLE_ERRORS.includes(err.code)) {
                console.warn(`[DB] Connection error (${err.code}), recreating pool and retrying...`);
                await recreatePool();
                // Retry once after fresh pool
                return await pool.query(sql, values);
            }
            throw err;
        }
    },
    async execute(sql, values) {
        try {
            return await pool.execute(sql, values);
        } catch (err) {
            if (RETRYABLE_ERRORS.includes(err.code)) {
                console.warn(`[DB] Connection error (${err.code}), recreating pool and retrying...`);
                await recreatePool();
                return await pool.execute(sql, values);
            }
            throw err;
        }
    },
    // Returns a connection from the current pool (for transactions)
    getConnection() {
        return pool.getConnection();
    },
    end() {
        return pool.end();
    },
};

module.exports = resilientPool;
