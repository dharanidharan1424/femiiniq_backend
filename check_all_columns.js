const pool = require("./src/config/db");

async function checkColumns() {
    try {
        const [rows] = await pool.query("SHOW COLUMNS FROM agents");
        console.log("Columns in agents table:");
        rows.forEach(r => console.log(r.Field));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkColumns();
