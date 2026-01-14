const pool = require('./config/db');

async function checkAgentsSchema() {
    try {
        console.log("--- AGENTS TABLE COLUMNS ---");
        const [rows] = await pool.query("SHOW COLUMNS FROM agents");
        console.log(JSON.stringify(rows.map(r => r.Field), null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkAgentsSchema();
