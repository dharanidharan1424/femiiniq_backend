const pool = require('./config/db');

async function testReviews() {
    try {
        console.log("Testing fetch reviews query...");
        const sql = `
      SELECT r.*, u.fullname AS reviewer_name, u.image AS reviewer_image
      FROM mobile_reviews r
      JOIN users u ON r.reviewer_id = u.id
      WHERE r.reviewee_id = ? AND r.reviewee_type = 'staff' AND r.reviewer_type = 'user'
      ORDER BY r.created_at DESC
    `;
        // Try with a random ID, e.g., 1. Even if no results, it shouldn't error unless table/column is missing.
        const [rows] = await pool.query(sql, [1]);
        console.log("Query success! Rows:", rows);
    } catch (err) {
        console.error("Query Failed!");
        console.error(err); // This will print the full SQL error
    } finally {
        process.exit();
    }
}

testReviews();
