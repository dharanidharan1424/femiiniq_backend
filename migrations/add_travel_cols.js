const pool = require('../config/db');

async function runMigration() {
    try {
        console.log("Running migration: Add travel columns to agents table...");

        // 1. Add service_location
        try {
            await pool.query(`
                ALTER TABLE agents 
                ADD COLUMN service_location ENUM('customer', 'provider', 'both') DEFAULT NULL
            `);
            console.log("✅ Added 'service_location' column.");
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log("ℹ️ 'service_location' column already exists.");
            } else {
                throw err;
            }
        }

        // 2. Add travel_radius
        try {
            await pool.query(`
                ALTER TABLE agents 
                ADD COLUMN travel_radius INT DEFAULT 0
            `);
            console.log("✅ Added 'travel_radius' column.");
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log("ℹ️ 'travel_radius' column already exists.");
            } else {
                throw err;
            }
        }

        // 3. Add travel_charge
        try {
            await pool.query(`
                ALTER TABLE agents 
                ADD COLUMN travel_charge DECIMAL(10, 2) DEFAULT 0.00
            `);
            console.log("✅ Added 'travel_charge' column.");
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log("ℹ️ 'travel_charge' column already exists.");
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
