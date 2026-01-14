const pool = require('./config/db');

async function createTable() {
    try {
        console.log("Creating mobile_reviews table...");
        const sql = `
      CREATE TABLE IF NOT EXISTS mobile_reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        reviewer_id INT NOT NULL,
        reviewer_type VARCHAR(50) NOT NULL,
        reviewee_id INT NOT NULL,
        reviewee_type VARCHAR(50) NOT NULL,
        rating DECIMAL(3,1) NOT NULL, -- e.g. 5.0
        comment TEXT,
        likes INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
        await pool.query(sql);
        console.log("Table mobile_reviews created successfully!");
    } catch (err) {
        console.error("Failed to create table!");
        console.error(err);
    } finally {
        process.exit();
    }
}

createTable();
