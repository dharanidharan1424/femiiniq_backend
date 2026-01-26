const pool = require("./config/dummyDb.js");

async function createTables() {
    try {
        console.log("⚙️ Creating missing tables...");

        // 1. agent_working_hours
        console.log("-> Creating 'agent_working_hours'...");
        await pool.query(`
      CREATE TABLE IF NOT EXISTS agent_working_hours (
        id INT PRIMARY KEY AUTO_INCREMENT,
        agent_id VARCHAR(50) NOT NULL,
        day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') NOT NULL,
        is_closed BOOLEAN DEFAULT FALSE,
        start_time TIME DEFAULT '09:00:00',
        end_time TIME DEFAULT '18:00:00',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_agent_day (agent_id, day_of_week)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
        console.log("   ✅ 'agent_working_hours' created.");

        // 2. availability_slots
        console.log("-> Creating 'availability_slots'...");
        await pool.query(`
      CREATE TABLE IF NOT EXISTS availability_slots (
        id INT PRIMARY KEY AUTO_INCREMENT,
        agent_id VARCHAR(50) NOT NULL,
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        is_available BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_slot (agent_id, date, start_time)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
        console.log("   ✅ 'availability_slots' created.");

        // 3. booking_slots
        console.log("-> Creating 'booking_slots'...");
        await pool.query(`
      CREATE TABLE IF NOT EXISTS booking_slots (
        id INT PRIMARY KEY AUTO_INCREMENT,
        agent_id VARCHAR(50) NOT NULL,
        date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        total_capacity INT DEFAULT 1,
        booked_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_booking_slot (agent_id, date, start_time)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
        console.log("   ✅ 'booking_slots' created.");

    } catch (error) {
        console.error("❌ Error creating tables:", error);
    } finally {
        process.exit();
    }
}

createTables();
