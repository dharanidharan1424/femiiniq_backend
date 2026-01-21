const pool = require("../config/dummyDb.js");

async function createAgentDeletionsTable() {
    try {
        console.log("🚀 Starting migration: Creating 'agent_deletions' table...");

        // Check if table already exists
        const [tables] = await pool.query("SHOW TABLES LIKE 'agent_deletions'");

        if (tables.length > 0) {
            console.log("✅ Table 'agent_deletions' already exists. Skipping creation.");
            process.exit(0);
            return;
        }

        // Create agent_deletions table
        await pool.query(`
      CREATE TABLE agent_deletions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        agent_id VARCHAR(50) NOT NULL,
        reason TEXT,
        deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_agent_id (agent_id),
        INDEX idx_deleted_at (deleted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

        console.log("✅ Table 'agent_deletions' created successfully!");
        console.log("✅ Migration completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
}

createAgentDeletionsTable();
