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

  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

module.exports = pool;
