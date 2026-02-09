const db = require('./config/db');
const fs = require('fs');
const path = require('path');

async function inspectNotifications() {
    try {
        const [rows] = await db.execute("SHOW FULL COLUMNS FROM notifications");
        let output = "Field | Type | Collation\n---|---|---\n";
        rows.forEach(r => {
            output += `${r.Field} | ${r.Type} | ${r.Collation}\n`;
        });
        fs.writeFileSync(path.join(__dirname, 'notifications_schema.txt'), output);
        console.log("Schema written to notifications_schema.txt");
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

inspectNotifications();
