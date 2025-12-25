const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "mysql.railway.internal",
  user: "root",
  password: "XwZeGsJsBjFrWOhaovnIiNvdIeCsEqYz",
  database: "railway",
  waitForConnections: true,
});

module.exports = pool;
