const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "feminiq.in",
  user: "Admin_Feminiqshop",
  password: "Feminiq416$",
  database: "feminiq",
  waitForConnections: true,
});

module.exports = pool;
