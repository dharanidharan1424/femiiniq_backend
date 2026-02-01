const pool = require('./config/db');

async function checkSchema() {
    try {
        const [rows] = await pool.query("DESCRIBE reviews");
        console.log("Reviews schema:", rows);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkSchema();
