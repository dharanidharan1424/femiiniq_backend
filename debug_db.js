const mysql = require("mysql2/promise");
require("dotenv").config();

async function debugBooking() {
    const pool = mysql.createPool({
        host: "localhost",
        user: "root",
        password: "",
        database: "feminq_shop",
        port: 3306,
    });

    try {
        const conn = await pool.getConnection();
        console.log("✅ Verified Connection to 'feminq_shop'");

        // 1. Check Tables
        const [tables] = await conn.execute("SHOW TABLES");
        console.log("📂 Tables in DB:", tables.map(t => Object.values(t)[0]));

        // 2. Check bookings columns
        try {
            const [columns] = await conn.execute("SHOW COLUMNS FROM bookings");
            console.log("📝 'bookings' table exists. Columns:", columns.map(c => c.Field));
        } catch (e) {
            console.log("❌ 'bookings' table DOES NOT exist!");
        }

        // 3. Check demobookings columns
        try {
            const [columns] = await conn.execute("SHOW COLUMNS FROM demobookings");
            console.log("📝 'demobookings' table exists. Columns:", columns.map(c => c.Field));
        } catch (e) {
            console.log("❌ 'demobookings' table DOES NOT exist!");
        }

        // 4. Try Dummy Insert into bookings (mimic booking.js)
        try {
            const [maxIdResult] = await conn.execute("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM bookings");
            const nextId = maxIdResult[0].next_id;
            console.log("🔢 Next ID calculation:", nextId);

            const testOrder = "ORDER_" + Date.now();

            // Minimal Insert
            const [result] = await conn.execute(
                `INSERT INTO bookings (id, order_id, user_id, agent_id, booking_date, booking_time, status, totalprice, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [nextId, testOrder, 1, 1, new Date(), "10:00", "Upcoming", 500, new Date()]
            );
            console.log("✅ Dummy INSERT successful. InsertId:", result.insertId);

            // 5. Verify Select
            const [rows] = await conn.execute("SELECT * FROM bookings WHERE id = ?", [nextId]);
            if (rows.length > 0) {
                console.log("✅ Verified SELECT:", rows[0]);
            } else {
                console.log("❌ SELECT failed after INSERT!");
            }

        } catch (e) {
            console.log("❌ Dummy INSERT failed:", e.message);
        }

        conn.release();
    } catch (error) {
        console.error("❌ Fatal DB Error:", error);
    } finally {
        await pool.end();
    }
}

debugBooking();
