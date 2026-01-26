const mysql = require("mysql2/promise");
const dotenv = require("dotenv");
dotenv.config();


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




// Wrapper to retry queries on connection loss
const originalQuery = pool.query.bind(pool);

pool.query = async function (...args) {
  let retries = 3;
  while (retries > 0) {
    try {
      return await originalQuery(...args);
    } catch (error) {
      if (error.code === 'PROTOCOL_CONNECTION_LOST' || error.code === 'ECONNRESET') {
        console.warn(`⚠️ Connection lost, retrying query... (Attempts left: ${retries - 1})`);
        retries--;
        if (retries === 0) throw error;
        // Wait 200ms to allow connection reset
        await new Promise(res => setTimeout(res, 200));
      } else {
        throw error;
      }
    }
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
