const pool = require('./config/db');

async function updateSchema() {
    try {
        // Check if column exists, we know it does.
        // Alter table to set default value for created_at
        // We use DATETIME or TIMESTAMP. The schema showed DATETIME.
        // Let's use TIMESTAMP for auto-initialization if possible, or DATETIME DEFAULT CURRENT_TIMESTAMP
        console.log("Altering reviews table...");
        await pool.query("ALTER TABLE reviews MODIFY created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
        console.log("Successfully updated reviews table schema to include DEFAULT CURRENT_TIMESTAMP.");
        process.exit(0);
    } catch (error) {
        console.error("Schema update failed:", error);
        process.exit(1);
    }
}

updateSchema();
