const pool = require('./config/db');

async function checkContent() {
    try {
        const [rows] = await pool.query("SELECT * FROM agent_categories LIMIT 5");
        console.log("agent_categories data:", rows);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkContent();
