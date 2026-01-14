const pool = require('../config/db');

async function addReviewsColumn() {
    try {
        console.log("🚀 Starting migration: Adding 'reviews' column to 'agents' table...");

        // 1. Check if column exists
        const [rows] = await pool.query("SHOW COLUMNS FROM agents LIKE 'reviews'");
        if (rows.length > 0) {
            console.log("✅ 'reviews' column already exists.");
        } else {
            console.log("⚠️ 'reviews' column missing. Adding now...");
            await pool.query("ALTER TABLE agents ADD COLUMN reviews INT DEFAULT 0 AFTER average_rating");
            console.log("✅ Successfully added 'reviews' column!");
        }

    } catch (err) {
        console.error("❌ Migration Failed:", err);
    } finally {
        process.exit();
    }
}

addReviewsColumn();
