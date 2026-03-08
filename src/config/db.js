const mysql = require("mysql2/promise");
const dotenv = require("dotenv");
const path = require("path");

// Load env from root
dotenv.config({ path: path.join(__dirname, "../../.env") });

const pool = mysql.createPool({
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
});

// Retry-aware query wrapper — handles stale connections on Render/cloud hosts
const RETRYABLE_ERRORS = [
    "PROTOCOL_CONNECTION_LOST",
    "ECONNRESET",
    "ETIMEDOUT",
    "ECONNREFUSED",
    "ER_SERVER_SHUTDOWN",
];

const resilientPool = {
    async query(sql, values) {
        try {
            return await pool.query(sql, values);
        } catch (err) {
            if (RETRYABLE_ERRORS.includes(err.code)) {
                console.warn(`[DB] Retrying after connection error: ${err.code}`);
                // Wait briefly then retry once with a fresh pool connection
                await new Promise((r) => setTimeout(r, 500));
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
                console.warn(`[DB] Retrying execute after connection error: ${err.code}`);
                await new Promise((r) => setTimeout(r, 500));
                return await pool.execute(sql, values);
            }
            throw err;
        }
    },
    // Pass through getConnection for transactions
    getConnection: pool.getConnection.bind(pool),
    end: pool.end.bind(pool),
};

module.exports = resilientPool;
