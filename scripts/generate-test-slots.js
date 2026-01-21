const pool = require("../config/dummyDb.js");

async function generateTestSlots() {
    try {
        console.log("🚀 Generating test availability slots...");

        // Get all agents
        const [agents] = await pool.query(
            "SELECT agent_id, work_start, work_end FROM agents WHERE agent_id IS NOT NULL LIMIT 5"
        );

        if (agents.length === 0) {
            console.log("❌ No agents found in database");
            process.exit(1);
        }

        console.log(`📋 Found ${agents.length} agents`);

        // Generate slots for next 7 days for each agent
        const today = new Date();
        const endDate = new Date();
        endDate.setDate(today.getDate() + 7);

        for (const agent of agents) {
            console.log(`\n🔧 Generating slots for agent: ${agent.agent_id}`);

            // Create default provider settings if not exists
            await pool.query(`
        INSERT INTO provider_settings (agent_id, provider_type, specialist_count, interval_minutes)
        VALUES (?, 'solo', 1, 30)
        ON DUPLICATE KEY UPDATE agent_id = agent_id
      `, [agent.agent_id]);

            // Generate slots via API simulation
            const startDateStr = today.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];

            const workStart = agent.work_start || '09:00:00';
            const workEnd = agent.work_end || '18:00:00';
            const serviceDuration = 60; // 60 minutes
            const intervalMinutes = 30; // 30 minutes

            // Helper to convert time to minutes
            const timeToMinutes = (timeStr) => {
                const [hours, mins] = timeStr.split(':').map(Number);
                return hours * 60 + mins;
            };

            const workStartMinutes = timeToMinutes(workStart);
            const workEndMinutes = timeToMinutes(workEnd);

            let currentDate = new Date(today);
            let totalSlots = 0;

            while (currentDate <= endDate) {
                const dateStr = currentDate.toISOString().split('T')[0];

                // Generate slots for this date
                let currentMinutes = workStartMinutes;

                while (currentMinutes < workEndMinutes) {
                    const slotStartTime = `${String(Math.floor(currentMinutes / 60)).padStart(2, '0')}:${String(currentMinutes % 60).padStart(2, '0')}:00`;
                    const slotEndMinutes = currentMinutes + serviceDuration;

                    if (slotEndMinutes <= workEndMinutes) {
                        const slotEndTime = `${String(Math.floor(slotEndMinutes / 60)).padStart(2, '0')}:${String(slotEndMinutes % 60).padStart(2, '0')}:00`;

                        // Insert into availability_slots
                        await pool.query(`
              INSERT INTO availability_slots 
                (agent_id, date, start_time, end_time, is_available)
              VALUES (?, ?, ?, ?, TRUE)
              ON DUPLICATE KEY UPDATE
                end_time = VALUES(end_time),
                is_available = VALUES(is_available)
            `, [agent.agent_id, dateStr, slotStartTime, slotEndTime]);

                        // Insert into booking_slots
                        await pool.query(`
              INSERT INTO booking_slots 
                (agent_id, date, start_time, end_time, total_capacity, booked_count)
              VALUES (?, ?, ?, ?, 1, 0)
              ON DUPLICATE KEY UPDATE
                end_time = VALUES(end_time),
                total_capacity = VALUES(total_capacity)
            `, [agent.agent_id, dateStr, slotStartTime, slotEndTime]);

                        totalSlots++;
                    }

                    currentMinutes = slotEndMinutes + intervalMinutes;
                }

                currentDate.setDate(currentDate.getDate() + 1);
            }

            console.log(`✅ Generated ${totalSlots} slots for ${agent.agent_id}`);
        }

        console.log("\n✅ Test slot generation completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error generating test slots:", error);
        process.exit(1);
    }
}

generateTestSlots();
