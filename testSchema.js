const pool = require('./config/db.js');
async function test() {
    try {
        const connCheck = await pool.getConnection();
        const [columns] = await connCheck.execute('SHOW COLUMNS FROM bookings');
        console.log(columns.map(c => c.Field));
        connCheck.release();
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}
test();
