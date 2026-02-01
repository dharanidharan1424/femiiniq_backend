const db = require("./config/dummyDb.js");

async function check() {
    try {
        const [cols] = await db.query("SHOW COLUMNS FROM agent_services");
        console.log("agent_services columns:", JSON.stringify(cols, null, 2));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
