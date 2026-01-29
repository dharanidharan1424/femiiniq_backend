const pool = require("./src/config/db");

async function checkBankTable() {
    try {
        console.log("\n--- Agent Bank Details Table ---");
        try {
            const [rows] = await pool.query("SHOW COLUMNS FROM agent_bank_details");
            rows.forEach(r => console.log(r.Field));
        } catch (e) {
            console.log("agent_bank_details table does not exist or error:", e.message);
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkBankTable();
