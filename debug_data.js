const db = require("./config/dummyDb.js");

async function check() {
    try {
        const [agents] = await db.query("SELECT id, agent_id, name FROM agents");
        console.log("Agents:", JSON.stringify(agents, null, 2));

        const [services] = await db.query("SELECT id, staff_id, name FROM services WHERE id = 14 OR name LIKE '%Fccjkkk%'");
        console.log("Services matching Fccjkkk:", JSON.stringify(services, null, 2));

        const [allServices] = await db.query("SELECT id, staff_id, name FROM services LIMIT 20");
        console.log("Sample Services:", JSON.stringify(allServices, null, 2));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
