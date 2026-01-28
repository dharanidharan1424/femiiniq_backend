const pool = require("./config/db");

async function fixColumn() {
    try {
        console.log("🚀 Fix Service Location Column...");
        const connection = await pool.getConnection();

        // Change to VARCHAR(50) to avoid truncation and ENUM mismatch
        await connection.query("ALTER TABLE agents MODIFY COLUMN service_location VARCHAR(50) DEFAULT 'both'");

        console.log("✅ service_location modified to VARCHAR(50)");
        connection.release();
        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

fixColumn();
