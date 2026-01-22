const pool = require("../config/dummyDb.js");

async function checkStatusColumn() {
    try {
        console.log("🔍 Checking 'agents' table schema...");
        const [columns] = await pool.query("SHOW COLUMNS FROM agents LIKE 'status'");
        console.log("Current definition:", columns[0]);
        process.exit(0);
    } catch (error) {
        console.error("❌ Failed to check column:", error);
        process.exit(1);
    }
}

checkStatusColumn();
