const pool = require('./config/db.js');

async function checkStatuses() {
    try {
        console.log("Checking booking statuses...");
        const [rows] = await pool.query("SELECT DISTINCT status FROM bookings");
        console.log("Unique statuses in DB:", rows);

        // Also check a few sample bookings to see the exact casing
        const [samples] = await pool.query("SELECT id, status, booking_date, user_id FROM bookings ORDER BY created_at DESC LIMIT 5");
        console.log("Sample bookings:", samples);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
checkStatuses();
