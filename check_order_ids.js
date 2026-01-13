const pool = require('./config/db.js');

async function checkOrderIds() {
    try {
        console.log("Checking order_ids for upcoming bookings...");
        const [rows] = await pool.query("SELECT id, order_id, status, booking_date FROM bookings WHERE status LIKE 'Upcoming%' OR status = 'upcoming' LIMIT 10");
        console.log("Upcoming Bookings:", rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
checkOrderIds();
