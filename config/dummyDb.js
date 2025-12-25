const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "mysql.railway.internal",
  user: "root",
  password: "XwZeGsJsBjFrWOhaovnIiNvdIeCsEqYz",
  database: "railway",
  waitForConnections: true,
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
