const pool = require("./src/config/db");

async function checkSchema() {
    try {
        console.log("--- Agents Table ---");
        const [agents] = await pool.query("SHOW COLUMNS FROM agents");
        agents.forEach(r => console.log(r.Field));

        console.log("\n--- Specialists Table ---");
        try {
            const [specialists] = await pool.query("SHOW COLUMNS FROM specialists");
            specialists.forEach(r => console.log(r.Field));
        } catch (e) {
            console.log("Specialists table does not exist or error:", e.message);
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkSchema();
