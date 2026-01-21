const express = require("express");
const router = express.Router();
const pool = require("../config/dummyDb");

router.delete("/", async (req, res) => {
    console.log("Partner delete account request received");

    // For now, we'll use agent_id from request body
    // In production, this should use authentication middleware
    const { agent_id, reason } = req.body;

    if (!agent_id) {
        return res.status(400).json({
            status: "error",
            message: "Agent ID is required",
        });
    }

    try {
        // 1. Check for upcoming bookings
        const [bookings] = await pool.query(
            "SELECT id FROM bookings WHERE agent_id = ? AND status = 'Upcoming'",
            [agent_id]
        );

        if (bookings.length > 0) {
            return res.status(409).json({
                status: "error",
                message: "Cannot delete account. You have upcoming bookings.",
            });
        }

        // 2. Log deletion reason if provided
        if (reason) {
            await pool.query(
                `INSERT INTO agent_deletions (agent_id, reason, deleted_at) VALUES (?, ?, NOW())`,
                [agent_id, reason]
            );
        }

        // 3. Delete related data first (foreign key constraints)
        await pool.query("DELETE FROM availability WHERE agent_id = ?", [agent_id]);
        await pool.query("DELETE FROM service_type WHERE agent_id = ?", [agent_id]);
        await pool.query("DELETE FROM service_package WHERE agent_id = ?", [agent_id]);
        await pool.query("DELETE FROM provider_settings WHERE agent_id = ?", [agent_id]);
        await pool.query("DELETE FROM availability_slots WHERE agent_id = ?", [agent_id]);
        await pool.query("DELETE FROM booking_slots WHERE agent_id = ?", [agent_id]);

        // 4. Delete agent account
        await pool.query("DELETE FROM agents WHERE agent_id = ?", [agent_id]);

        return res.json({
            status: "success",
            message: "Account deleted successfully",
        });
    } catch (error) {
        console.error("Delete partner account error:", error);
        return res.status(500).json({
            status: "error",
            message: "Failed to delete account. Please try again.",
        });
    }
});

module.exports = router;
