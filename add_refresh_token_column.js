const pool = require("./config/db");

async function addRefreshTokenColumn() {
    try {
        console.log("Using shared DB pool...");

        const tableName = "agents";
        const columnName = "refresh_token";

        // Check if column exists
        const [columns] = await pool.query(
            `SHOW COLUMNS FROM ${tableName} LIKE '${columnName}'`
        );

        if (columns.length > 0) {
            console.log(`✅ Column '${columnName}' already exists in '${tableName}'.`);
        } else {
            console.log(`Adding column '${columnName}' to '${tableName}'...`);
            await pool.query(
                `ALTER TABLE ${tableName} ADD COLUMN ${columnName} TEXT DEFAULT NULL`
            );
            console.log(`✅ Column '${columnName}' added successfully.`);
        }

    } catch (error) {
        console.error("❌ Error:", error.message);
    } finally {
        console.log("Exiting...");
        process.exit(0);
    }
}

addRefreshTokenColumn();
