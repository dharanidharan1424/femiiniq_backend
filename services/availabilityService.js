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

async function generateSlotsForAgent(agent_id, start_date, end_date, service_duration = 60, interval_minutes = null, start_time_override = null, end_time_override = null) {
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

        // Use overrides if provided, otherwise settings/defaults
        const finalInterval = interval_minutes !== null ? parseInt(interval_minutes) : settings.interval_minutes;
        const finalDuration = parseInt(service_duration);

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

            // Clear existing availability_slots and booking_slots for the requested range to prevent overlaps from previous settings
            // Note: In a real production app, we should valid that we are not deleting slots that have actual bookings. 
            // For now, per requirements, we regenerate. Ideally we check for boookings first.
            const deleteParams = [agent_id, startDateObj.toISOString().split('T')[0], endDateObj.toISOString().split('T')[0]];

            // Delete slots that don't have active bookings? 
            // Or just wipe all availablity? The prompt says "if it was booked it should remove in user side".
            // If we delete a slot that has a booking, we lose track of capacity?
            // Actually, booking_slots table tracks capacity. If we delete it...
            // Let's assume we want to "reset" availability.
            // Safe approach: Delete where booked_count = 0.
            // But if settings changed (e.g. duration), we might need to invalidate even booked slots?
            // For this phase, let's just delete all and recreate. 
            // Wait, if there are existing bookings (booked_count > 0), we shouldn't delete that record blindly or we break relationships?
            // The `booking_slots` table seems to be the capacity tracker. 
            // If we have a booking at 9:00, and we change interval to start at 9:30...
            // The 9:00 booking remains valid but the slot is gone?
            // Let's implement a clean-up that deletes only UNBOOKED slots first.

            // Aggressively clear slots. 
            // We delete ALL availability_slots for the range to ensure the Schedule UI (which reflects availability) is clean.
            // Existing bookings in `booking_slots` are preserved if they have counts, but they won't appear as "Available" slots if they don't match the new schedule.
            // This is the correct behavior: we are redefining "Availability".
            await conn.query(`
                DELETE FROM availability_slots 
                WHERE agent_id = ? 
                AND date >= ? AND date <= ?
            `, [agent_id, startDateObj.toISOString().split('T')[0], endDateObj.toISOString().split('T')[0]]);

            // Clean up unbooked entries from booking_slots
            await conn.query(`
                DELETE FROM booking_slots 
                WHERE agent_id = ? 
                AND date >= ? AND date <= ? 
                AND booked_count = 0
            `, [agent_id, startDateObj.toISOString().split('T')[0], endDateObj.toISOString().split('T')[0]]);

            while (currentDate <= endDateObj) {
                const dateStr = currentDate.toISOString().split('T')[0];
                const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });

                // Check specific day overrides first (passed as args)
                if (start_time_override && end_time_override) {
                    // Determine if closed (e.g. 00:00 - 00:00)
                    if (start_time_override === "00:00:00" && end_time_override === "00:00:00") {
                        isClosed = true;
                    } else {
                        startTime = start_time_override;
                        endTime = end_time_override;
                        isClosed = false;
                    }
                } else {
                    const daySchedule = workingHoursMap[dayName];
                    if (daySchedule) {
                        startTime = daySchedule.start_time;
                        endTime = daySchedule.end_time;
                        isClosed = daySchedule.is_closed;
                    }
                }

                // Only generate slots if schedule exists and not closed
                if (startTime && !isClosed) {
                    // Generate slots for this date
                    const dailySlots = generateDailySlots(
                        startTime,
                        endTime,
                        finalDuration,
                        finalInterval
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
