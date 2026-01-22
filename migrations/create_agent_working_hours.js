const pool = require("../config/dummyDb.js");

async function createAgentWorkingHoursTable() {
    try {
        console.log("🚀 Starting migration: Creating 'agent_working_hours' table...");

        // Check if table already exists
        const [tables] = await pool.query("SHOW TABLES LIKE 'agent_working_hours'");

        if (tables.length > 0) {
            console.log("✅ Table 'agent_working_hours' already exists. Skipping creation.");
            process.exit(0);
            return;
        }

        // Create agent_working_hours table
        await pool.query(`
      CREATE TABLE agent_working_hours (
        id INT PRIMARY KEY AUTO_INCREMENT,
        agent_id VARCHAR(50) NOT NULL,
        day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') NOT NULL,
        is_closed BOOLEAN DEFAULT FALSE,
        start_time TIME DEFAULT '09:00:00',
        end_time TIME DEFAULT '18:00:00',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_agent_day (agent_id, day_of_week),
        INDEX idx_agent_id (agent_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

        console.log("✅ Table 'agent_working_hours' created successfully!");
        console.log("✅ Migration completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
}

createAgentWorkingHoursTable();
