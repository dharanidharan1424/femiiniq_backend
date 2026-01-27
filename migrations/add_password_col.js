const pool = require('../config/db');

async function runMigration() {
    try {
        console.log("Running migration: Add password column to users table...");

        try {
            await pool.query(`
                ALTER TABLE users 
                ADD COLUMN password VARCHAR(255) DEFAULT NULL
            `);
            console.log("✅ Added 'password' column to users table.");
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log("ℹ️ 'password' column already exists in users table.");
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
