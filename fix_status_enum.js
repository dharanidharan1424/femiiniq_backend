const pool = require("./src/config/db");

async function fixStatus() {
    try {
        console.log("Updating status column...");
        await pool.query(`
            ALTER TABLE agents 
            MODIFY COLUMN status 
            ENUM('Available', 'Busy', 'Offline', 'Unavailable', 'Not Available', 'Pending Onboarding', 'Pending Verification', 'Pending Approval') 
            NOT NULL DEFAULT 'Available'
        `);
        console.log("✅ Status column updated successfully.");
        process.exit();
    } catch (error) {
        console.error("❌ Failed:", error.message);
        process.exit(1);
    }
}

fixStatus();
