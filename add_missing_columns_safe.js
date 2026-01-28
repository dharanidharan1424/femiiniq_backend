const pool = require("./config/db");

async function runMigration() {
    console.log("🚀 Starting Safer Migration...");
    const connection = await pool.getConnection();

    const columnsToAdd = [
        "ALTER TABLE agents ADD COLUMN partner_type ENUM('solo', 'studio') DEFAULT 'solo'",
        "ALTER TABLE agents ADD COLUMN owner_name VARCHAR(255)",
        "ALTER TABLE agents ADD COLUMN salon_name VARCHAR(255)"
    ];

    for (const query of columnsToAdd) {
        try {
            await connection.query(query);
            console.log(`✅ Success: ${query}`);
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log(`ℹ️ Skipped (Exists): ${query}`);
            } else {
                console.error(`❌ Failed: ${query}`, error.message);
            }
        }
    }

    connection.release();
    console.log("✨ Migration attempts finished.");
    process.exit(0);
}

runMigration();
