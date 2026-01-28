const pool = require("./config/db");

async function checkColumns() {
    try {
        const [rows] = await pool.query("SHOW COLUMNS FROM agents");
        console.log("Columns in agents table:");
        rows.forEach(row => console.log(row.Field));
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

checkColumns();
