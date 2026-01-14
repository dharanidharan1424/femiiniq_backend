const pool = require('./config/db');

async function checkData() {
    try {
        console.log("--- DATA in reviews ---");
        const [rows] = await pool.query("SELECT * FROM reviews LIMIT 5");
        console.log(JSON.stringify(rows, null, 2));

        console.log("\n--- DATA in agents ---");
        const [agents] = await pool.query("SELECT id, agent_id, name FROM agents LIMIT 5");
        console.log(JSON.stringify(agents, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkData();
