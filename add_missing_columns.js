const pool = require("./config/db");

async function runMigration() {
    try {
        console.log("🚀 Starting Helper Migration...");
        const connection = await pool.getConnection();

        // Add missing columns if they don't exist
        await connection.query(`
            ALTER TABLE agents 
            ADD COLUMN IF NOT EXISTS partner_type ENUM('solo', 'studio') DEFAULT 'solo',
            ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255),
            ADD COLUMN IF NOT EXISTS salon_name VARCHAR(255);
        `);
        console.log("✅ agents table updated with missing columns (partner_type, owner_name, salon_name)");

        connection.release();
        process.exit(0);
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
}

runMigration();
