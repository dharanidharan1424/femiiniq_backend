const db = require("./config/dummyDb.js");

async function check() {
    try {
        const [columns] = await db.query("SHOW COLUMNS FROM services");
        console.log("Services Columns:", JSON.stringify(columns, null, 2));

        const [sample] = await db.query("SELECT * FROM services LIMIT 2");
        console.log("Sample Service Data:", JSON.stringify(sample, null, 2));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
