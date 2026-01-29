const pool = require("./src/config/db");

async function checkStatus() {
    try {
        const [rows] = await pool.query("SHOW COLUMNS FROM agents LIKE 'status'");
        console.log("Current Status Column:", rows[0].Type);
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkStatus();
