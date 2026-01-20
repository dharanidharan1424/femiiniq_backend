const db = require("./config/dummyDb.js");

async function checkSchema() {
    try {
        const [rows] = await db.query("DESCRIBE bookings");
        const col = rows.find(r => r.Field === 'status');
        console.log("status column definition:", col);
        process.exit(0);
    } catch (error) {
        console.error("Error describing table:", error);
        process.exit(1);
    }
}

checkSchema();
