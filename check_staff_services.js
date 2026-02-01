const db = require("./config/dummyDb.js");

async function check() {
    try {
        const [cols] = await db.query("SHOW COLUMNS FROM staff_services");
        console.log("staff_services columns:", JSON.stringify(cols, null, 2));

        const [sample] = await db.query("SELECT * FROM staff_services LIMIT 10");
        console.log("staff_services sample:", JSON.stringify(sample, null, 2));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
