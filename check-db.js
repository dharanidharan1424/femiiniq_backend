const pool = require("./config/db");

async function checkSchema() {
    try {
        const [rows] = await pool.query("DESCRIBE agents");
        console.log("Agents Table Schema:");
        rows.forEach(row => {
            console.log(`${row.Field}: ${row.Type}`);
        });
        process.exit(0);
    } catch (err) {
        console.error("Error checking schema:", err);
        process.exit(1);
    }
}

checkSchema();
