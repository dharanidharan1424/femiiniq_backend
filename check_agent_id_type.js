const pool = require("./src/config/db");

async function checkAgentIdType() {
    try {
        const [rows] = await pool.query("DESCRIBE agents");
        const agentIdCol = rows.find(r => r.Field === 'agent_id');
        console.log("agent_id column details:", agentIdCol);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkAgentIdType();
