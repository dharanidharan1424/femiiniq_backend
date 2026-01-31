const pool = require("./config/dummyDb.js");

async function inspect() {
    try {
        console.log("--- AGENTS TABLE ---");
        const [rows] = await pool.query("DESCRIBE users");
        console.log(JSON.stringify(rows, null, 2));

        console.log("\n--- PROVIDER_SETTINGS TABLE ---");
        try {
            const [settingsDesc] = await pool.query("DESCRIBE provider_settings");
            console.log(JSON.stringify(settingsDesc, null, 2));
        } catch (e) {
            console.log("provider_settings table might not exist or error:", e.message);
        }

    } catch (error) {
        console.error("Error inspecting DB:", error);
    } finally {
        process.exit();
    }
}

inspect();
