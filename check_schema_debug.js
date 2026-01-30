const db = require("./config/dummyDb");

async function checkSchema() {
    try {
        console.log("--- service_categories ---");
        const [sc] = await db.query("DESCRIBE service_categories");
        console.table(sc);

        console.log("--- agent_categories ---");
        const [ac] = await db.query("DESCRIBE agent_categories");
        console.table(ac);

        console.log("--- agent_services ---");
        const [as] = await db.query("DESCRIBE agent_services");
        console.table(as);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();
