const pool = require("../config/db");

async function migrate() {
    try {
        const connection = await pool.getConnection();
        console.log("🚀 Starting Image Column Migration...");

        // Helper to add column if not exists
        const addColumnIfNotExists = async (table, column, definition) => {
            const [cols] = await connection.query(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = ? 
                AND COLUMN_NAME = ?
            `, [table, column]);

            if (cols.length === 0) {
                await connection.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
                console.log(`✅ ${table} table updated with ${column} column`);
            } else {
                console.log(`ℹ️ ${column} column already exists in ${table}`);
            }
        };

        const imageDefinition = "VARCHAR(255) DEFAULT 'https://res.cloudinary.com/djponxjp9/image/upload/v1736230557/MobileApp/placeholder.png'";

        await addColumnIfNotExists('agent_services', 'image', imageDefinition);
        await addColumnIfNotExists('agent_packages', 'image', imageDefinition);

        connection.release();
        console.log("✨ Migration successful!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
}

migrate();
