const pool = require('../config/db');

async function fixReviewsTable() {
    try {
        console.log("🚀 Starting migration: Fixing 'reviews' table ID...");

        // 1. Check current structure
        console.log("Checking current structure...");
        const [rows] = await pool.query("DESCRIBE reviews");
        const idCol = rows.find(r => r.Field === 'id');
        console.log("Current ID column:", idCol);

        if (idCol.Extra.includes('auto_increment')) {
            console.log("✅ 'id' is already AUTO_INCREMENT. No action needed.");
        } else {
            console.log("⚠️ 'id' is NOT AUTO_INCREMENT. Fixing now...");
            // 2. Modify column
            // Assuming 'id' is already INT and PRIMARY KEY.
            // We just need to add AUTO_INCREMENT attribute.
            await pool.query("ALTER TABLE reviews MODIFY id INT AUTO_INCREMENT");
            console.log("✅ Successfully altered table 'reviews'!");
        }

    } catch (err) {
        console.error("❌ Migration Failed:", err);
    } finally {
        process.exit();
    }
}

fixReviewsTable();
