const express = require("express");
const router = express.Router();
const pool = require("../config/dummyDb");

const authenticateToken = require("../middleware/authToken");

router.delete("/", authenticateToken, async (req, res) => {
    console.log("Partner delete account request received");

    // Use agent_id from authenticated token
    const agent_id = req.user.agent_id;
    const { reason } = req.body;

    if (!agent_id) {
        return res.status(400).json({
            status: "error",
            message: "Agent ID is required",
        });
    }

    try {
        // 1. Get numeric ID of the agent for tables that use it
        const [agentRow] = await pool.query(
            "SELECT id FROM agents WHERE agent_id = ?",
            [agent_id]
        );
        const numeric_id = agentRow[0]?.id;

        // 2. Check for upcoming bookings
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

        // 3. Log deletion reason
        if (reason) {
            try {
                await pool.query(
                    `INSERT INTO agent_deleted_accounts (agent_id, reason, extra_reason, deleted_at) VALUES (?, ?, ?, NOW())`,
                    [agent_id, reason, ""]
                );
            } catch (logError) {
                console.log("Note: Could not log deletion reason:", logError.message);
            }
        }

        // 4. Delete related data first (foreign key constraints)
        // New Tables
        await pool.query("DELETE FROM agent_categories WHERE agent_id = ?", [agent_id]);
        await pool.query("DELETE FROM agent_services WHERE agent_id = ?", [agent_id]);
        await pool.query("DELETE FROM agent_packages WHERE agent_id = ?", [agent_id]);
        await pool.query("DELETE FROM specialists WHERE agent_id = ?", [agent_id]);
        await pool.query("DELETE FROM agent_images WHERE agent_id = ?", [agent_id]);

        // agent_notes uses numeric ID
        if (numeric_id) {
            await pool.query("DELETE FROM agent_notes WHERE agent_id = ?", [numeric_id]);
        }

        await pool.query("DELETE FROM agent_availability WHERE agent_id = ?", [agent_id]);
        await pool.query("DELETE FROM agent_bank_details WHERE agent_id = ?", [agent_id]);
        await pool.query("DELETE FROM provider_settings WHERE agent_id = ?", [agent_id]);
        await pool.query("DELETE FROM agent_working_hours WHERE agent_id = ?", [agent_id]);

        // Legacy Tables
        await pool.query("DELETE FROM availability WHERE agent_id = ?", [agent_id]);
        await pool.query("DELETE FROM service_type WHERE agent_id = ?", [agent_id]);
        await pool.query("DELETE FROM service_package WHERE agent_id = ?", [agent_id]);
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
