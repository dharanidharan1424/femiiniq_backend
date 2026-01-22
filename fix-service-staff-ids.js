const pool = require("./config/db");

/**
 * This script fixes the staff_id in service_types and service_packages tables
 * by matching agent_id to the agents table and updating staff_id accordingly.
 */

async function fixServiceStaffIds() {
    try {
        console.log("🔧 Starting to fix service staff_id values...\n");

        // First, get all agents with their id and agent_id
        const agentsQuery = `
      SELECT id, agent_id, name 
      FROM agents 
      WHERE agent_id IS NOT NULL AND agent_id != ''
    `;
        const agentsResult = await pool.query(agentsQuery);
        const agents = agentsResult.rows;

        console.log(`📋 Found ${agents.length} agents with agent_id:\n`);
        agents.forEach(agent => {
            console.log(`  - ${agent.name} (id: ${agent.id}, agent_id: ${agent.agent_id})`);
        });
        console.log("");

        // Fix service_types table
        console.log("🔄 Fixing service_types table...");
        let serviceTypesFixed = 0;

        for (const agent of agents) {
            const updateServiceTypesQuery = `
        UPDATE service_types 
        SET staff_id = $1 
        WHERE agent_id = $2 AND staff_id != $1
        RETURNING id, name
      `;
            const result = await pool.query(updateServiceTypesQuery, [agent.id, agent.agent_id]);

            if (result.rowCount > 0) {
                console.log(`  ✅ Updated ${result.rowCount} services for ${agent.name} (${agent.agent_id})`);
                result.rows.forEach(service => {
                    console.log(`     - ${service.name} (id: ${service.id})`);
                });
                serviceTypesFixed += result.rowCount;
            }
        }
        console.log(`\n✅ Fixed ${serviceTypesFixed} service types\n`);

        // Fix service_packages table
        console.log("🔄 Fixing service_packages table...");
        let servicePackagesFixed = 0;

        for (const agent of agents) {
            const updatePackagesQuery = `
        UPDATE service_packages 
        SET staff_id = $1 
        WHERE agent_id = $2 AND staff_id != $1
        RETURNING id, name
      `;
            const result = await pool.query(updatePackagesQuery, [agent.id, agent.agent_id]);

            if (result.rowCount > 0) {
                console.log(`  ✅ Updated ${result.rowCount} packages for ${agent.name} (${agent.agent_id})`);
                result.rows.forEach(pkg => {
                    console.log(`     - ${pkg.name} (id: ${pkg.id})`);
                });
                servicePackagesFixed += result.rowCount;
            }
        }
        console.log(`\n✅ Fixed ${servicePackagesFixed} service packages\n`);

        // Verify the changes
        console.log("🔍 Verifying changes...");
        const verifyQuery = `
      SELECT 
        st.id, 
        st.name, 
        st.staff_id, 
        st.agent_id,
        a.name as agent_name
      FROM service_types st
      LEFT JOIN agents a ON st.agent_id = a.agent_id
      WHERE st.agent_id IS NOT NULL AND st.agent_id != ''
      LIMIT 10
    `;
        const verifyResult = await pool.query(verifyQuery);

        console.log("\nSample of updated services:");
        verifyResult.rows.forEach(row => {
            console.log(`  - ${row.name} | staff_id: ${row.staff_id} | agent_id: ${row.agent_id} | agent: ${row.agent_name}`);
        });

        console.log("\n✅ All done! Service staff_id values have been fixed.");
        console.log(`   Total services fixed: ${serviceTypesFixed}`);
        console.log(`   Total packages fixed: ${servicePackagesFixed}`);

    } catch (error) {
        console.error("❌ Error fixing service staff_id values:", error);
    } finally {
        await pool.end();
    }
}

fixServiceStaffIds();
