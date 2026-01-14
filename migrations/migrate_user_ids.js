const pool = require("../config/db.js");

/**
 * Migration: Update existing user IDs from FC0000 to FC0000000001 format
 * 
 * This script updates all existing users' unique_id from 4-digit padding
 * to 10-digit padding to maintain consistency with new registrations.
 * 
 * Example:
 * - FC0001 → FC0000000001
 * - FC0012 → FC0000000012
 * - FC0123 → FC0000000123
 */

async function migrateUserIds() {
    console.log("🚀 Starting user ID migration...");

    try {
        // First, check current database state
        const [users] = await pool.query(
            "SELECT id, unique_id FROM users WHERE unique_id LIKE 'FC%' ORDER BY id"
        );

        console.log(`📊 Found ${users.length} users with FC prefix`);

        if (users.length === 0) {
            console.log("✅ No users to migrate");
            return;
        }

        // Show sample of current IDs
        console.log("\n📋 Sample of current IDs:");
        users.slice(0, 5).forEach(user => {
            console.log(`  User ${user.id}: ${user.unique_id}`);
        });

        // Perform migration using SQL UPDATE
        console.log("\n🔄 Migrating user IDs...");

        const [result] = await pool.query(`
      UPDATE users 
      SET unique_id = CONCAT('FC', LPAD(SUBSTRING(unique_id, 3), 10, '0'))
      WHERE unique_id LIKE 'FC%' 
        AND LENGTH(unique_id) < 12
    `);

        console.log(`✅ Migration complete! Updated ${result.affectedRows} users`);

        // Verify migration
        const [updatedUsers] = await pool.query(
            "SELECT id, unique_id FROM users WHERE unique_id LIKE 'FC%' ORDER BY id LIMIT 10"
        );

        console.log("\n✨ Sample of updated IDs:");
        updatedUsers.forEach(user => {
            console.log(`  User ${user.id}: ${user.unique_id}`);
        });

        // Check for any issues
        const [shortIds] = await pool.query(
            "SELECT COUNT(*) as count FROM users WHERE unique_id LIKE 'FC%' AND LENGTH(unique_id) < 12"
        );

        if (shortIds[0].count > 0) {
            console.warn(`⚠️  Warning: ${shortIds[0].count} users still have short IDs`);
        } else {
            console.log("\n✅ All user IDs successfully migrated to new format!");
        }

    } catch (error) {
        console.error("❌ Migration failed:", error);
        throw error;
    } finally {
        await pool.end();
    }
}

// Run migration
if (require.main === module) {
    migrateUserIds()
        .then(() => {
            console.log("\n🎉 Migration script completed successfully");
            process.exit(0);
        })
        .catch((error) => {
            console.error("\n💥 Migration script failed:", error);
            process.exit(1);
        });
}

module.exports = migrateUserIds;
