const pool = require("../config/db");

async function createTables() {
    try {
        console.log("🚀 Starting Database Migration...");

        const connection = await pool.getConnection();

        // 1. agent_categories
        await connection.query(`
      CREATE TABLE IF NOT EXISTS agent_categories (
        id INT PRIMARY KEY AUTO_INCREMENT,
        agent_id VARCHAR(50) NOT NULL,
        category_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_agent_category (agent_id, category_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
        console.log("✅ agent_categories table ready");

        // 2. agent_services
        await connection.query(`
      CREATE TABLE IF NOT EXISTS agent_services (
        id INT PRIMARY KEY AUTO_INCREMENT,
        agent_id VARCHAR(50) NOT NULL,
        category_id INT NOT NULL,
        service_name VARCHAR(255) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        duration INT NOT NULL COMMENT 'Duration in minutes',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
        console.log("✅ agent_services table ready");

        // 3. agent_packages
        await connection.query(`
      CREATE TABLE IF NOT EXISTS agent_packages (
        id INT PRIMARY KEY AUTO_INCREMENT,
        agent_id VARCHAR(50) NOT NULL,
        package_name VARCHAR(255) NOT NULL,
        total_price DECIMAL(10, 2) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
        console.log("✅ agent_packages table ready");

        // 4. package_items
        await connection.query(`
      CREATE TABLE IF NOT EXISTS package_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        package_id INT NOT NULL,
        service_id INT NOT NULL,
        FOREIGN KEY (package_id) REFERENCES agent_packages(id) ON DELETE CASCADE,
        FOREIGN KEY (service_id) REFERENCES agent_services(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
        console.log("✅ package_items table ready");

        // 5. agent_availability
        await connection.query(`
      CREATE TABLE IF NOT EXISTS agent_availability (
        id INT PRIMARY KEY AUTO_INCREMENT,
        agent_id VARCHAR(50) NOT NULL,
        day VARCHAR(20) NOT NULL COMMENT 'Monday, Tuesday, etc.',
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_agent_day (agent_id, day)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
        console.log("✅ agent_availability table ready");

        // 6. agent_bank_details
        await connection.query(`
      CREATE TABLE IF NOT EXISTS agent_bank_details (
        id INT PRIMARY KEY AUTO_INCREMENT,
        agent_id VARCHAR(50) NOT NULL,
        account_number VARCHAR(50) NOT NULL,
        ifsc_code VARCHAR(20) NOT NULL,
        account_holder_name VARCHAR(255) NOT NULL,
        bank_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_agent_bank (agent_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
        console.log("✅ agent_bank_details table ready");

        // 7. Ensure agents table has required columns
        // We won't alter potentially existing columns to avoid data loss, just adding if missing is safer,
        // but for now, we assume the user's schema check is correct.
        // However, let's make sure 'partner_type' exists as it's crucial for the new flow.
        try {
            await connection.query(`
            ALTER TABLE agents 
            ADD COLUMN IF NOT EXISTS partner_type ENUM('solo', 'studio') DEFAULT 'solo',
            ADD COLUMN IF NOT EXISTS service_location ENUM('customer_home', 'salon_visit', 'both') DEFAULT 'both',
            ADD COLUMN IF NOT EXISTS travel_charge_per_km DECIMAL(10,2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS experience_years INT DEFAULT 0
        `);
            console.log("✅ agents table updated with new columns");
        } catch (err) {
            console.log("ℹ️ agents table update skipped/error: " + err.message);
        }

        connection.release();
        console.log("✨ All tables created successfully!");
        process.exit(0);

    } catch (error) {
        console.error("❌ Error creating tables:", error);
        process.exit(1);
    }
}

createTables();
