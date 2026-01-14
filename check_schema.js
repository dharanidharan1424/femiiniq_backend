const pool = require('./config/db');

async function checkSchema() {
    try {
        console.log("--- START REVIEWS ---");
        const [reviews] = await pool.query("DESCRIBE reviews");
        reviews.forEach(r => console.log(`R:${r.Field} (${r.Type})`));
        console.log("--- END REVIEWS ---");

        console.log("--- START AGENTS ---");
        const [agents] = await pool.query("DESCRIBE agents");
        agents.forEach(a => console.log(`A:${a.Field} (${a.Type})`));
        console.log("--- END AGENTS ---");
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkSchema();
