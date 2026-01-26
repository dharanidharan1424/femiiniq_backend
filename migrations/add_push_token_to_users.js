const pool = require('../config/db');

async function runMigration() {
    try {
        console.log("Running migration: Add expo_push_token to users table...");

        try {
            await pool.query(`
                ALTER TABLE users 
                ADD COLUMN expo_push_token VARCHAR(255) DEFAULT NULL
            `);
            console.log("✅ Added 'expo_push_token' column to users table.");
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log("ℹ️ 'expo_push_token' column already exists in users table.");
            } else {
                throw err;
            }
        }

        console.log("🎉 Migration completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
}

runMigration();
