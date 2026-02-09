const db = require('./config/db');

async function debugOrder() {
    const orderId = 'order_SDv9tk3eKN3lYE';
    const agentId = 'FP000013';
    const newStatus = 'confirmed';
    const userStatus = 'Upcoming'; // Corrected from 'Confirmed'
    const startOtp = '1234';

    console.log(`Updating order: ${orderId} with status ${userStatus}`);
    try {
        const query = `UPDATE bookings SET booking_status = ?, status = ?, start_otp = ? WHERE order_id = ? AND agent_id = ?`;
        const params = [newStatus, userStatus, startOtp, orderId, agentId];

        const [result] = await db.execute(query, params);
        console.log("Update success. Affected rows:", result.affectedRows);
    } catch (error) {
        console.error("Update failed with error:");
        console.error(error);
    }
    process.exit(0);
}

debugOrder();
