const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "trolley.proxy.rlwy.net",
  port: "39841",
  user: "root",
  password: "XwZeGsJsBjFrWOhaovnIiNvdIeCsEqYz",//XwZeGsJsBjFrWOhaovnIiNvdIeCsEqYz
  database: "railway",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: "utf8mb4",

  // Fix for PROTOCOL_CONNECTION_LOST on Render/Railway
  // Aggressive v3 config + Retry Strategy
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  maxIdle: 0,
  idleTimeout: 30000,
  connectionLimit: 5
});

// Wrapper to retry queries on connection loss
const originalQuery = pool.query.bind(pool);

pool.query = async function (...args) {
  try {
    return await originalQuery(...args);
  } catch (error) {
    if (error.code === 'PROTOCOL_CONNECTION_LOST' || error.code === 'ECONNRESET') {
      console.warn('⚠️ Connection lost, retrying query...');
      return await originalQuery(...args);
    }
    throw error;
  }
};

// ✅ Function to check if the database is live
async function checkDatabaseConnection() {
  try {
    const connection = await pool.getConnection();
    console.log("✅ Database connection successful!");
    connection.release(); // release back to pool
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
  }
}

checkDatabaseConnection();

module.exports = pool;
