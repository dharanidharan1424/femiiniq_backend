const pool = require("../config/dummyDb.js");

async function createAvailabilitySlotsTable() {
    try {
        console.log("🚀 Starting migration: Creating 'availability_slots' table...");

        // Check if table already exists
        const [tables] = await pool.query("SHOW TABLES LIKE 'availability_slots'");

        if (tables.length > 0) {
            console.log("✅ Table 'availability_slots' already exists. Skipping creation.");
            process.exit(0);
            return;
        }

        // Create availability_slots table
        await pool.query(`
      CREATE TABLE availability_slots (
        id INT PRIMARY KEY AUTO_INCREMENT,
        agent_id VARCHAR(50) NOT NULL,
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        is_available BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_slot (agent_id, date, start_time),
        INDEX idx_agent_date (agent_id, date),
        INDEX idx_date_available (date, is_available)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

        console.log("✅ Table 'availability_slots' created successfully!");
        console.log("✅ Migration completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
}

createAvailabilitySlotsTable();
