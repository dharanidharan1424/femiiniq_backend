const pool = require('./config/db');
async function check() {
    try {
        const searchValues = [9, 'agent_9', 'FP0000112']; // Add any other possible values
        for (const val of searchValues) {
            console.log(`--- Searching for ${val} ---`);
            const [s1] = await pool.query('SELECT * FROM service_type WHERE staff_id = ? OR agent_id = ?', [val, val]);
            console.log(`service_type for ${val}:`, s1.length);

            const [s2] = await pool.query('SELECT * FROM service_types WHERE staff_id = ?', [val]);
            console.log(`service_types for ${val}:`, s2.length);

            const [s3] = await pool.query('SELECT * FROM service_package WHERE staff_id = ? OR agent_id = ?', [val, val]);
            console.log(`service_package for ${val}:`, s3.length);
        }

        // Check what FP0000112 is
        const [a112] = await pool.query('SELECT * FROM agents WHERE agent_id = "FP0000112" OR id = 112');
        console.log('Agent FP0000112:', a112);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
