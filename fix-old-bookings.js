const db = require("./config/db.js");

async function fixBookings() {
    try {
        console.log("Attempting to fix booking agent_ids...");

        // Check counts before update
        const [beforeRows] = await db.query("SELECT COUNT(*) as count FROM bookings WHERE agent_id = '12'");
        console.log(`Found ${beforeRows[0].count} bookings with agent_id = '12'`);

        if (beforeRows[0].count > 0) {
            const [result] = await db.query("UPDATE bookings SET agent_id = 'FP000012' WHERE agent_id = '12'");
            console.log("Successfully updated bookings. Affected rows:", result.affectedRows);
        } else {
            console.log("No bookings found to update.");
        }

        process.exit(0);
    } catch (error) {
        console.error("Error updating bookings:", error);
        process.exit(1);
    }
}

fixBookings();
