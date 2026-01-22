const express = require("express");
const router = express.Router();
const db = require("../config/dummyDb.js");
const { generateSlotsForAgent } = require("../services/availabilityService.js");

// POST /partner/availability/working-hours - Update working hours
router.post("/working-hours", async (req, res) => {
    const { agent_id, working_hours } = req.body;

    if (!agent_id) {
        return res.status(400).json({
            status: "error",
            message: "agent_id is required"
        });
    }

    if (!working_hours || !Array.isArray(working_hours)) {
        return res.status(400).json({
            status: "error",
            message: "working_hours array is required"
        });
    }

    const conn = await db.getConnection();

    try {
        await conn.beginTransaction();

        // Check if agent exists
        const [agents] = await conn.query("SELECT id FROM agents WHERE agent_id = ?", [agent_id]);
        if (agents.length === 0) {
            await conn.rollback();
            return res.status(404).json({ status: "error", message: "Agent not found" });
        }

        // Process each day
        for (const daySchedule of working_hours) {
            const { day, start, end, enabled } = daySchedule;

            // Validate day name
            const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            if (!validDays.includes(day)) {
                continue; // Skip invalid days
            }

            const isClosed = !enabled;
            const startTime = start || '09:00:00'; // Default fallback
            const endTime = end || '18:00:00';     // Default fallback

            await conn.query(`
                INSERT INTO agent_working_hours 
                (agent_id, day_of_week, is_closed, start_time, end_time)
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                is_closed = VALUES(is_closed),
                start_time = VALUES(start_time),
                end_time = VALUES(end_time),
                updated_at = CURRENT_TIMESTAMP
            `, [agent_id, day, isClosed, startTime, endTime]);
        }

        await conn.commit();

        // Trigger slot generation for next 30 days
        const today = new Date();
        const next30Days = new Date(today);
        next30Days.setDate(today.getDate() + 30);

        generateSlotsForAgent(
            agent_id,
            today.toISOString().split('T')[0],
            next30Days.toISOString().split('T')[0]
        ).catch(err => console.error("Background slot generation failed:", err));

        res.json({
            status: "success",
            message: "Working hours updated successfully"
        });

    } catch (error) {
        await conn.rollback();
        console.error("Error updating working hours:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to update working hours"
        });
    } finally {
        conn.release();
    }
});

// GET /partner/availability/working-hours/:agentId - Get working hours
router.get("/working-hours/:agentId", async (req, res) => {
    const { agentId } = req.params;

    if (!agentId) {
        return res.status(400).json({
            status: "error",
            message: "agentId is required"
        });
    }

    try {
        const [hours] = await db.query(
            "SELECT day_of_week, is_closed, start_time, end_time FROM agent_working_hours WHERE agent_id = ?",
            [agentId]
        );

        res.json({
            status: "success",
            working_hours: hours
        });
    } catch (error) {
        console.error("Error fetching working hours:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to fetch working hours"
        });
    }
});

module.exports = router;
