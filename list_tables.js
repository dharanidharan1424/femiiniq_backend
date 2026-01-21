const db = require("./config/dummyDb.js");
const fs = require("fs");

async function listTables() {
    try {
        const [rows] = await db.query("SHOW TABLES");
        fs.writeFileSync("tables.json", JSON.stringify(rows, null, 2));
        console.log("Tables saved to tables.json");
        process.exit(0);
    } catch (error) {
        console.error("Error listing tables:", error);
        process.exit(1);
    }
}

listTables();
