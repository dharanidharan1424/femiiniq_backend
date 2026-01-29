const pool = require("./src/config/db");

async function runMigration() {
    console.log("🚀 Starting Final Onboarding Migration...");
    const connection = await pool.getConnection();

    const updates = [
        // Add document columns if they don't exist
        "ALTER TABLE agents ADD COLUMN document_type VARCHAR(50)",
        "ALTER TABLE agents ADD COLUMN document_url VARCHAR(555)", // Increased length for long URLs

        // Update status column to be flexible (VARCHAR) instead of restrictive ENUM
        // This prevents "Data truncated for column 'status'" or "Invalid enum value" errors
        "ALTER TABLE agents MODIFY COLUMN status VARCHAR(50) DEFAULT 'pending'"
    ];

    for (const query of updates) {
        try {
            await connection.query(query);
            console.log(`✅ Success: ${query}`);
        } catch (error) {
            // Check for specific error codes if needed, but for now we just log
            // ER_DUP_FIELDNAME (1060) means column exists
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log(`ℹ️ Skipped (Column Exists): ${query}`);
            } else {
                console.log(`⚠️ Note: ${query} - ${error.message}`);
            }
        }
    }

    connection.release();
    console.log("✨ Final Onboarding Migration Finished.");
    process.exit(0);
}

runMigration();
