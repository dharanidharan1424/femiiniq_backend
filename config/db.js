const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "---",
  user: "---",
  password: "---",
  database: "---",
  waitForConnections: true,
});

module.exports = pool;
