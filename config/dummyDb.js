const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "trolley.proxy.rlwy.net",
  port: "39841",
  user: "root",
  password: "XwZeGsJsBjFrWOhaovnIiNvdIeCsEqYz",//XwZeGsJsBjFrWOhaovnIiNvdIeCsEqYz
  database: "railway",
  waitForConnections: true,
  connectionLimit: 5,
});

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

// Run the check once when this file is loaded
checkDatabaseConnection();

module.exports = pool;
