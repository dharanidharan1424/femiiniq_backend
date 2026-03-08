const mysql = require("mysql2/promise");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../../.env") });

const DB_CONFIG = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    connectTimeout: 30000,
    charset: "utf8mb4",
};

// Railway's external proxy kills idle pool connections.
// Solution: single persistent connection with auto-reconnect on every query.

let connection = null;
let isConnecting = false;

async function connect() {
    // Prevent multiple simultaneous connect attempts
    if (isConnecting) {
        await new Promise(r => setTimeout(r, 300));
        return connect();
    }

    isConnecting = true;
    const delays = [1000, 3000, 6000, 10000];

    for (let i = 0; i <= delays.length; i++) {
        try {
            console.log(`[DB] Connecting... (attempt ${i + 1})`);
            const conn = await mysql.createConnection(DB_CONFIG);

            conn.on("error", (err) => {
                console.warn("[DB] Connection dropped:", err.code);
                connection = null;
            });

            console.log("[DB] Connected to Railway MySQL.");
            isConnecting = false;
            return conn;
        } catch (err) {
            if (i < delays.length) {
                console.warn(`[DB] Failed (${err.code}), retrying in ${delays[i] / 1000}s...`);
                await new Promise(r => setTimeout(r, delays[i]));
            } else {
                isConnecting = false;
                throw err;
            }
        }
    }
}

async function getConn() {
    if (connection) {
        try {
            await connection.ping();
            return connection;
        } catch (_) {
            console.warn("[DB] Ping failed, reconnecting...");
            connection = null;
        }
    }
    connection = await connect();
    return connection;
}

const RETRYABLE = ["PROTOCOL_CONNECTION_LOST", "ECONNRESET", "ETIMEDOUT", "ECONNREFUSED"];

async function run(fn) {
    for (let attempt = 0; attempt < 2; attempt++) {
        try {
            const conn = await getConn();
            return await fn(conn);
        } catch (err) {
            if (RETRYABLE.includes(err.code) && attempt === 0) {
                console.warn(`[DB] Query error (${err.code}), reconnecting and retrying...`);
                connection = null;
            } else {
                throw err;
            }
        }
    }
}

const db = {
    query: (sql, values) => run(conn => conn.query(sql, values)),
    execute: (sql, values) => run(conn => conn.execute(sql, values)),
    getConnection: getConn,
};

// Warm up connection at startup
getConn()
    .then(() => console.log("[DB] Warmup complete."))
    .catch(err => console.warn("[DB] Warmup failed, will retry on first query:", err.message));

module.exports = db;
