const pool = require("../config/dummyDb.js");

async function checkStatusValues() {
    try {
        console.log("🔍 Checking existing 'status' values in 'agents' table...");
        const [rows] = await pool.query("SELECT DISTINCT status FROM agents");
        console.log("Existing values:", rows);

        // Also let's check row 6 specifically if possible, or just first 10
        const [allRows] = await pool.query("SELECT id, status FROM agents LIMIT 10");
        console.log("First 10 rows:", allRows);

        process.exit(0);
    } catch (error) {
        console.error("❌ Failed to check values:", error);
        process.exit(1);
    }
}

checkStatusValues();
