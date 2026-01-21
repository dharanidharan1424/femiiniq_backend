const pool = require("../config/dummyDb.js");

async function createBookingSlotsTable() {
    try {
        console.log("🚀 Starting migration: Creating 'booking_slots' table...");

        // Check if table already exists
        const [tables] = await pool.query("SHOW TABLES LIKE 'booking_slots'");

        if (tables.length > 0) {
            console.log("✅ Table 'booking_slots' already exists. Skipping creation.");
            process.exit(0);
            return;
        }

        // Create booking_slots table
        await pool.query(`
      CREATE TABLE booking_slots (
        id INT PRIMARY KEY AUTO_INCREMENT,
        agent_id VARCHAR(50) NOT NULL,
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        total_capacity INT NOT NULL DEFAULT 1,
        booked_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_booking_slot (agent_id, date, start_time),
        INDEX idx_agent_date (agent_id, date),
        INDEX idx_capacity (agent_id, date, booked_count, total_capacity),
        CHECK (booked_count <= total_capacity)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

        console.log("✅ Table 'booking_slots' created successfully!");
        console.log("✅ Migration completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
}

createBookingSlotsTable();
