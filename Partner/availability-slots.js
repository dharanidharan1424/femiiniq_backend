const express = require("express");
const router = express.Router();
const db = require("../config/dummyDb.js");

// Helper function to add minutes to a time string
function addMinutes(timeStr, minutes) {
    const [hours, mins] = timeStr.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60);
    const newMins = totalMinutes % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}:00`;
}

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

// POST /partner/availability/generate-slots - Generate slots for date range
router.post("/generate-slots", async (req, res) => {
    const { agent_id, start_date, end_date, service_duration } = req.body;

    if (!agent_id || !start_date || !end_date) {
        return res.status(400).json({
            status: "error",
            message: "agent_id, start_date, and end_date are required"
        });
    }

    const finalServiceDuration = service_duration || 60; // Default 60 minutes

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

        // Fetch agent working hours
        const [agents] = await db.query(
            "SELECT work_start, work_end FROM agents WHERE agent_id = ?",
            [agent_id]
        );

        if (agents.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Agent not found"
            });
        }

        const workStart = agents[0].work_start || '09:00:00';
        const workEnd = agents[0].work_end || '18:00:00';

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

                // Generate slots for this date
                const dailySlots = generateDailySlots(
                    workStart,
                    workEnd,
                    finalServiceDuration,
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

                // Move to next date
                currentDate.setDate(currentDate.getDate() + 1);
            }

            await conn.commit();

            res.json({
                status: "success",
                message: `Generated ${totalSlotsCreated} slots successfully`,
                slots_created: totalSlotsCreated,
                settings: {
                    work_hours: `${workStart} - ${workEnd}`,
                    service_duration: finalServiceDuration,
                    interval_minutes: settings.interval_minutes,
                    provider_type: settings.provider_type,
                    capacity: settings.specialist_count
                }
            });
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    } catch (error) {
        console.error("Error generating slots:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to generate slots"
        });
    }
});

// GET /partner/availability/slots/:agentId - Fetch generated slots
router.get("/slots/:agentId", async (req, res) => {
    const { agentId } = req.params;
    const { start_date, end_date } = req.query;

    if (!agentId) {
        return res.status(400).json({
            status: "error",
            message: "agentId is required"
        });
    }

    try {
        let query = `
      SELECT 
        a.id, a.date, a.start_time, a.end_time, a.is_available,
        b.total_capacity, b.booked_count,
        (b.total_capacity - b.booked_count) as available_capacity
      FROM availability_slots a
      LEFT JOIN booking_slots b 
        ON a.agent_id = b.agent_id 
        AND a.date = b.date 
        AND a.start_time = b.start_time
      WHERE a.agent_id = ?
    `;
        const params = [agentId];

        if (start_date) {
            query += " AND a.date >= ?";
            params.push(start_date);
        }

        if (end_date) {
            query += " AND a.date <= ?";
            params.push(end_date);
        }

        query += " ORDER BY a.date ASC, a.start_time ASC";

        const [slots] = await db.query(query, params);

        res.json({
            status: "success",
            slots: slots
        });
    } catch (error) {
        console.error("Error fetching slots:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to fetch slots"
        });
    }
});

// PATCH /partner/availability/slots/:slotId - Toggle slot availability
router.patch("/slots/:slotId", async (req, res) => {
    const { slotId } = req.params;
    const { is_available } = req.body;

    if (!slotId) {
        return res.status(400).json({
            status: "error",
            message: "slotId is required"
        });
    }

    if (is_available === undefined) {
        return res.status(400).json({
            status: "error",
            message: "is_available is required"
        });
    }

    try {
        await db.query(
            "UPDATE availability_slots SET is_available = ? WHERE id = ?",
            [is_available, slotId]
        );

        res.json({
            status: "success",
            message: "Slot availability updated"
        });
    } catch (error) {
        console.error("Error updating slot:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to update slot"
        });
    }
});

// DELETE /partner/availability/slots - Clear slots for date range
router.delete("/slots", async (req, res) => {
    const { agent_id, start_date, end_date } = req.query;

    if (!agent_id) {
        return res.status(400).json({
            status: "error",
            message: "agent_id is required"
        });
    }

    try {
        const conn = await db.getConnection();

        try {
            await conn.beginTransaction();

            let query = "DELETE FROM availability_slots WHERE agent_id = ?";
            const params = [agent_id];

            if (start_date) {
                query += " AND date >= ?";
                params.push(start_date);
            }

            if (end_date) {
                query += " AND date <= ?";
                params.push(end_date);
            }

            await conn.query(query, params);

            // Also delete from booking_slots
            let bookingQuery = "DELETE FROM booking_slots WHERE agent_id = ?";
            const bookingParams = [agent_id];

            if (start_date) {
                bookingQuery += " AND date >= ?";
                bookingParams.push(start_date);
            }

            if (end_date) {
                bookingQuery += " AND date <= ?";
                bookingParams.push(end_date);
            }

            await conn.query(bookingQuery, bookingParams);

            await conn.commit();

            res.json({
                status: "success",
                message: "Slots cleared successfully"
            });
        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    } catch (error) {
        console.error("Error clearing slots:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to clear slots"
        });
    }
});

module.exports = router;
