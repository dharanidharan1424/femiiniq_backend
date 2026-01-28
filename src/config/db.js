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
    connectionLimit: 5,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    charset: "utf8mb4",
});

module.exports = pool;
