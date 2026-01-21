const pool = require("../config/dummyDb.js");

async function createProviderSettingsTable() {
    try {
        console.log("🚀 Starting migration: Creating 'provider_settings' table...");

        // Check if table already exists
        const [tables] = await pool.query("SHOW TABLES LIKE 'provider_settings'");

        if (tables.length > 0) {
            console.log("✅ Table 'provider_settings' already exists. Skipping creation.");
            process.exit(0);
            return;
        }

        // Create provider_settings table
        await pool.query(`
      CREATE TABLE provider_settings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        agent_id VARCHAR(50) NOT NULL UNIQUE,
        provider_type ENUM('solo', 'studio') NOT NULL DEFAULT 'solo',
        specialist_count INT DEFAULT 1,
        interval_minutes INT DEFAULT 30,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_agent_id (agent_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

        console.log("✅ Table 'provider_settings' created successfully!");

        // Insert default settings for existing agents
        console.log("📝 Creating default settings for existing agents...");
        await pool.query(`
      INSERT INTO provider_settings (agent_id, provider_type, specialist_count, interval_minutes)
      SELECT agent_id, 'solo', 1, 30
      FROM agents
      WHERE agent_id IS NOT NULL
      ON DUPLICATE KEY UPDATE agent_id = agent_id;
    `);

        console.log("✅ Default settings created for existing agents!");
        console.log("✅ Migration completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
}

createProviderSettingsTable();
