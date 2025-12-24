const mysql = require("mysql2/promise");

const db = mysql.createPool({
  host: "localhost",
  user: "root", // your local MySQL username
  password: "", // your local MySQL password
  database: "feminq_shop", // change to your DB name
  port: 3306, // default MySQL port
});

module.exports = db;
