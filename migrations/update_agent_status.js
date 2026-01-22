const pool = require("../config/dummyDb.js");

async function updateAgentStatusColumn() {
    try {
        console.log("🚀 Starting migration: Updating 'status' column in 'agents' table...");

        // Include 'Not Available' which was found in existing data
        await pool.query(`
            ALTER TABLE agents 
            MODIFY COLUMN status 
            ENUM('Available', 'Busy', 'Offline', 'Unavailable', 'Not Available', 'Pending Onboarding') 
            NOT NULL DEFAULT 'Available'
        `);

        console.log("✅ Successfully updated 'status' column to include 'Pending Onboarding' and 'Not Available'");
        process.exit(0);
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
}

updateAgentStatusColumn();
