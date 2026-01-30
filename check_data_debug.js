const db = require("./config/dummyDb");
const fs = require("fs");

async function checkData() {
    try {
        const [ac] = await db.query("SELECT * FROM agent_categories LIMIT 10");
        const [as] = await db.query("SELECT * FROM agent_services LIMIT 10");
        const [ag] = await db.query("SELECT agent_id, shop_id, full_name FROM agents LIMIT 5");

        const output = {
            agent_categories: ac,
            agent_services: as,
            agents_sample: ag
        };

        fs.writeFileSync("data_debug.json", JSON.stringify(output, null, 2));
        console.log("Written to data_debug.json");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkData();
