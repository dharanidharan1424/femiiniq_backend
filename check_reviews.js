const pool = require('./config/db');

async function checkReviews() {
    try {
        const [rows] = await pool.query("SELECT id, created_at, CAST(created_at as CHAR) as created_at_str FROM reviews ORDER BY id DESC LIMIT 5");
        console.log("Reviews data:", rows);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkReviews();
