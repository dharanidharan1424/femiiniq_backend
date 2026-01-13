const pool = require('./config/db.js');

async function checkStatuses() {
    try {
        const [rows] = await pool.query("SELECT DISTINCT status FROM bookings");
        console.log("Unique statuses:", rows.map(r => r.status));

        // Check services column format
        const [services] = await pool.query("SELECT id, services FROM bookings ORDER BY created_at DESC LIMIT 1");
        console.log("Sample services:", services[0]);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
checkStatuses();
