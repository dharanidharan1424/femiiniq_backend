const pool = require("../config/db.js");

async function verifyMigration() {
    try {
        const [users] = await pool.query(
            "SELECT id, unique_id FROM users WHERE unique_id LIKE 'FC%' ORDER BY id"
        );

        console.log("\n✅ User IDs after migration:");
        console.log("================================");
        users.forEach(user => {
            console.log(`User ${user.id}: ${user.unique_id}`);
        });
        console.log("================================\n");

        const allCorrect = users.every(u => u.unique_id.length === 12);
        if (allCorrect) {
            console.log("✅ All user IDs are in correct format (12 characters)!");
        } else {
            console.log("⚠️  Some user IDs may need attention");
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await pool.end();
    }
}

verifyMigration();
