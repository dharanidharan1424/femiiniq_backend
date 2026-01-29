const mysql = require("mysql2/promise");
require("dotenv").config({ path: "./.env" }); // Adjust path if needed

const dbConfig = {
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "feminiq_db", // Verify DB name
};

async function addRefreshTokenColumn() {
    let connection;
    try {
        console.log("Connecting to database...");
        connection = await mysql.createConnection(dbConfig);
        console.log("Connected.");

        const tableName = "agents"; // Ensure this matches user's table name
        const columnName = "refresh_token";

        // Check if column exists
        const [columns] = await connection.query(
            `SHOW COLUMNS FROM ${tableName} LIKE '${columnName}'`
        );

        if (columns.length > 0) {
            console.log(`Column '${columnName}' already exists in '${tableName}'.`);
        } else {
            console.log(`Adding column '${columnName}' to '${tableName}'...`);
            await connection.query(
                `ALTER TABLE ${tableName} ADD COLUMN ${columnName} TEXT DEFAULT NULL`
            );
            console.log(`Column '${columnName}' added successfully.`);
        }

    } catch (error) {
        console.error("Error:", error.message);
    } finally {
        if (connection) await connection.end();
        console.log("Done.");
    }
}

addRefreshTokenColumn();
