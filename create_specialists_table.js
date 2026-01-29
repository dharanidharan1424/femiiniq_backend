const pool = require("./src/config/db");

async function createSpecialistsTable() {
    try {
        const query = `
      CREATE TABLE IF NOT EXISTS specialists (
        id INT AUTO_INCREMENT PRIMARY KEY,
        agent_id VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        experience VARCHAR(50),
        image TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (agent_id) REFERENCES agents(agent_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=latin1;
    `;
        await pool.query(query);
        console.log("Specialists table created successfully.");
        process.exit(0);
    } catch (e) {
        console.error("Error creating table:", e);
        process.exit(1);
    }
}

createSpecialistsTable();
