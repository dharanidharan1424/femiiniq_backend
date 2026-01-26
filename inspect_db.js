const pool = require("./config/dummyDb.js");

async function inspect() {
    try {
        console.log("--- AGENTS TABLE ---");
        const [agentsDesc] = await pool.query("DESCRIBE agents");
        console.log(JSON.stringify(agentsDesc, null, 2));

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
