const pool = require("../config/dummyDb");

async function setupSequences() {
    try {
        console.log("Setting up ID sequences table...");

        await pool.query(`
            CREATE TABLE IF NOT EXISTS id_sequences (
                name VARCHAR(50) PRIMARY KEY,
                last_val INT NOT NULL DEFAULT 0
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        // Get max from agents
        const [agentsMax] = await pool.query("SELECT MAX(CAST(SUBSTRING(agent_id, 3) AS UNSIGNED)) as maxVal FROM agents WHERE agent_id LIKE 'FP%'");

        // Get max from deleted accounts (if table exists)
        let deletedMaxVal = 0;
        try {
            const [deletedMax] = await pool.query("SELECT MAX(CAST(SUBSTRING(agent_id, 3) AS UNSIGNED)) as maxVal FROM agent_deleted_accounts WHERE agent_id LIKE 'FP%'");
            deletedMaxVal = deletedMax[0]?.maxVal || 0;
        } catch (e) {
            console.log("Note: agent_deleted_accounts table not found or empty, skipping...");
        }

        const currentMax = Math.max(agentsMax[0]?.maxVal || 0, deletedMaxVal);
        console.log(`Current Maximum Agent Numeric ID found: ${currentMax}`);

        await pool.query(
            "INSERT INTO id_sequences (name, last_val) VALUES ('agent_id', ?) ON DUPLICATE KEY UPDATE last_val = GREATEST(last_val, ?)",
            [currentMax, currentMax]
        );

        console.log("✅ id_sequences table ready. Last value set to:", currentMax);
        process.exit(0);
    } catch (error) {
        console.error("❌ Error setting up sequences:", error);
        process.exit(1);
    }
}

setupSequences();
