const db = require("../config/dummyDb.js");

// Helper function to convert time to minutes
function timeToMinutes(timeStr) {
    const [hours, mins] = timeStr.split(':').map(Number);
    return hours * 60 + mins;
}

// Generate daily slots based on working hours and interval
function generateDailySlots(workStart, workEnd, serviceDuration, intervalMinutes) {
    const slots = [];
    const workStartMinutes = timeToMinutes(workStart);
    const workEndMinutes = timeToMinutes(workEnd);

    let currentMinutes = workStartMinutes;

    while (currentMinutes < workEndMinutes) {
        const slotStartTime = `${String(Math.floor(currentMinutes / 60)).padStart(2, '0')}:${String(currentMinutes % 60).padStart(2, '0')}:00`;
        const slotEndMinutes = currentMinutes + serviceDuration;

        // Only add slot if it ends within working hours
        if (slotEndMinutes <= workEndMinutes) {
            const slotEndTime = `${String(Math.floor(slotEndMinutes / 60)).padStart(2, '0')}:${String(slotEndMinutes % 60).padStart(2, '0')}:00`;
            slots.push({ start_time: slotStartTime, end_time: slotEndTime });
        }

        // Next slot starts after service duration + interval
        currentMinutes = slotEndMinutes + intervalMinutes;
    }

    return slots;
}

async function generateSlotsForAgent(agent_id, start_date, end_date, service_duration = 60) {
    console.log(`Generating slots for agent ${agent_id} from ${start_date} to ${end_date}`);

    try {
        // Fetch provider settings
        const [providerSettings] = await db.query(
            "SELECT * FROM provider_settings WHERE agent_id = ?",
            [agent_id]
        );

        const settings = providerSettings.length > 0 ? providerSettings[0] : {
            provider_type: 'solo',
            specialist_count: 1,
            interval_minutes: 30
        };

        // Fetch detailed working hours first
        const [workingHours] = await db.query(
            "SELECT day_of_week, is_closed, start_time, end_time FROM agent_working_hours WHERE agent_id = ?",
            [agent_id]
        );

        // Map working hours by day name for easy lookup
        const workingHoursMap = {};
        if (workingHours.length > 0) {
            workingHours.forEach(wh => {
                workingHoursMap[wh.day_of_week] = wh;
            });
        } else {
            // Fallback to agents table if no detailed hours found
            const [agents] = await db.query(
                "SELECT work_start, work_end FROM agents WHERE agent_id = ?",
                [agent_id]
            );

            if (agents.length > 0) {
                const defaultStart = agents[0].work_start || '09:00:00';
                const defaultEnd = agents[0].work_end || '18:00:00';
                const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

                days.forEach(day => {
                    workingHoursMap[day] = {
                        day_of_week: day,
                        is_closed: false,
                        start_time: defaultStart,
                        end_time: defaultEnd
                    };
                });
            } else {
                throw new Error("Agent not found or no working hours defined");
            }
        }

        // Generate slots for each date in range
        const startDateObj = new Date(start_date);
        const endDateObj = new Date(end_date);
        let currentDate = new Date(startDateObj);

        let totalSlotsCreated = 0;
        const conn = await db.getConnection();

        try {
            await conn.beginTransaction();

            while (currentDate <= endDateObj) {
                const dateStr = currentDate.toISOString().split('T')[0];
                const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });

                const daySchedule = workingHoursMap[dayName];

                // Only generate slots if schedule exists and not closed
                if (daySchedule && !daySchedule.is_closed) {
                    // Generate slots for this date
                    const dailySlots = generateDailySlots(
                        daySchedule.start_time,
                        daySchedule.end_time,
                        service_duration,
                        settings.interval_minutes
                    );

                    // Insert slots into availability_slots
                    for (const slot of dailySlots) {
                        await conn.query(`
                            INSERT INTO availability_slots 
                            (agent_id, date, start_time, end_time, is_available)
                            VALUES (?, ?, ?, ?, TRUE)
                            ON DUPLICATE KEY UPDATE
                            end_time = VALUES(end_time),
                            is_available = VALUES(is_available)
                        `, [agent_id, dateStr, slot.start_time, slot.end_time]);

                        // Also create booking slot with capacity
                        await conn.query(`
                            INSERT INTO booking_slots 
                            (agent_id, date, start_time, end_time, total_capacity, booked_count)
                            VALUES (?, ?, ?, ?, ?, 0)
                            ON DUPLICATE KEY UPDATE
                            end_time = VALUES(end_time),
                            total_capacity = VALUES(total_capacity)
                        `, [agent_id, dateStr, slot.start_time, slot.end_time, settings.specialist_count]);

                        totalSlotsCreated++;
                    }
                }

                // Move to next date
                currentDate.setDate(currentDate.getDate() + 1);
            }

            await conn.commit();
            return {
                success: true,
                slots_created: totalSlotsCreated,
                settings
            };

        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }

    } catch (error) {
        console.error("Service Error generating slots:", error);
        throw error;
    }
}

module.exports = {
    generateSlotsForAgent
};
