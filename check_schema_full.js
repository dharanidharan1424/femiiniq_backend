const pool = require("./config/db");

async function checkSchema() {
    try {
        const [rows] = await pool.query("DESCRIBE agents");
        console.log("Schema of agents table:");
        // Filter for service_location
        const col = rows.find(r => r.Field === 'service_location');
        console.log(col);
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

checkSchema();
