const pool = require('./config/db');

async function checkSchema() {
    try {
        const [rows] = await pool.query("DESCRIBE agent_categories");
        console.log("agent_categories schema:", rows);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkSchema();
