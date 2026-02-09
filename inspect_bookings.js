const db = require('./config/db');
const fs = require('fs');
const path = require('path');

async function inspectConstraints() {
    try {
        const [rows] = await db.execute("SELECT * FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_NAME = 'bookings' AND TABLE_SCHEMA = '" + process.env.DB_NAME + "'");
        fs.writeFileSync(path.join(__dirname, 'constraints_schema.txt'), JSON.stringify(rows, null, 2));
        console.log("Constraints written to constraints_schema.txt");
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

inspectConstraints();
