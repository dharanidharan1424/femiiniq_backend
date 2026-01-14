const pool = require('./config/db');

async function describeTables() {
    try {
        const tables = ['reviews', 'mobile_reviews', 'agents', 'users'];
        for (const table of tables) {
            console.log(`\n--- Structure of table: ${table} ---`);
            try {
                const [rows] = await pool.query(`DESCRIBE ${table}`);
                console.log(JSON.stringify(rows, null, 2));
            } catch (err) {
                console.log(`Table ${table} does not exist or cannot be described.`);
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

describeTables();
