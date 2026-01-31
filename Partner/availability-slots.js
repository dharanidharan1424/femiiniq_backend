const express = require("express");
const router = express.Router();
const db = require("../config/dummyDb.js");
const { generateSlotsForAgent } = require("../services/availabilityService.js");

// POST /partner/availability/generate-slots - Generate slots for date range
// POST /partner/availability/generate-slots - Generate slots for date range
router.post("/generate-slots", async (req, res) => {
    const {
        agent_id,
        start_date,
        end_date,
        service_duration,
        interval_minutes,
        start_time_override,
        end_time_override
    } = req.body;

    if (!agent_id || !start_date || !end_date) {
        return res.status(400).json({
            status: "error",
            message: "agent_id, start_date, and end_date are required"
        });
    }

    try {
        const result = await generateSlotsForAgent(
            agent_id,
            start_date,
            end_date,
            service_duration,
            interval_minutes,
            start_time_override,
            end_time_override
        );

        res.json({
            status: "success",
            message: `Generated ${result.slots_created} slots successfully`,
            slots_created: result.slots_created,
            settings: result.settings
        });
    } catch (error) {
        console.error("Error generating slots:", error);
        res.status(500).json({
            status: "error",
            message: error.message || "Failed to generate slots"
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
        COALESCE(b.total_capacity, 1) as total_capacity, 
        COALESCE(b.booked_count, 0) as booked_count,
        COALESCE(b.total_capacity - b.booked_count, 1) as available_capacity
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

// DELETE /partner/availability/slots/:slotId - Delete a single slot
router.delete("/slots/:slotId", async (req, res) => {
    const { slotId } = req.params;

    if (!slotId) {
        return res.status(400).json({ status: "error", message: "slotId is required" });
    }

    try {
        await db.query("DELETE FROM availability_slots WHERE id = ?", [slotId]);
        // Note: We do NOT delete from booking_slots here because we don't know the time/date easily without fetching first, 
        // and booking_slots is aggregated. 
        // If we want to decrement capacity, we'd need to fetch the slot details first. 
        // For now, removing from availability_slots hides it from the UI, which satisfies "Remove particular slot".

        res.json({ status: "success", message: "Slot deleted" });
    } catch (error) {
        console.error("Error deleting slot:", error);
        res.status(500).json({ status: "error", message: "Failed to delete slot" });
    }
});

module.exports = router;
