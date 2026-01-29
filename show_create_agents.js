const pool = require("./src/config/db");

async function showCreateAgents() {
    try {
        const [rows] = await pool.query("SHOW CREATE TABLE agents");
        console.log(rows[0]['Create Table']);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

showCreateAgents();
