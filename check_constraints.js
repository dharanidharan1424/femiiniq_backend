const pool = require('./config/db');

async function checkConstraints() {
    try {
        console.log("--- REVIEWS TABLE CONSTRAINTS ---");
        const [rows] = await pool.query("DESCRIBE reviews");
        // Print relevant columns to check for constraints
        const relevant = rows.map(r => ({
            Field: r.Field,
            Type: r.Type,
            Null: r.Null,
            Default: r.Default
        }));
        console.log(JSON.stringify(relevant, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkConstraints();
