const db = require("./config/dummyDb");
const fs = require("fs");

async function checkSchema() {
    try {
        const [sc] = await db.query("DESCRIBE service_categories");
        const [ac] = await db.query("DESCRIBE agent_categories");
        const [as] = await db.query("DESCRIBE agent_services");

        const output = {
            service_categories: sc,
            agent_categories: ac,
            agent_services: as
        };

        fs.writeFileSync("schema_debug.json", JSON.stringify(output, null, 2));
        console.log("Written to schema_debug.json");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();
