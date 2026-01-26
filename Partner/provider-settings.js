const express = require("express");
const router = express.Router();
const db = require("../config/dummyDb.js");

// POST /partner/provider-settings - Create or update provider settings
router.post("/", async (req, res) => {
    const { agent_id, provider_type, specialist_count, interval_minutes } = req.body;

    if (!agent_id) {
        return res.status(400).json({
            status: "error",
            message: "agent_id is required"
        });
    }

    // Validate provider_type
    if (provider_type && !['solo', 'studio'].includes(provider_type)) {
        return res.status(400).json({
            status: "error",
            message: "provider_type must be 'solo' or 'studio'"
        });
    }

    // Validate specialist_count
    const finalProviderType = provider_type || 'solo';
    let finalSpecialistCount = specialist_count || 1;

    if (finalProviderType === 'solo') {
        finalSpecialistCount = 1; // Force solo to have 1 specialist
    } else if (finalSpecialistCount < 1) {
        return res.status(400).json({
            status: "error",
            message: "specialist_count must be at least 1 for studio"
        });
    }

    // Validate interval_minutes
    const finalIntervalMinutes = interval_minutes !== undefined ? interval_minutes : 30;
    if (finalIntervalMinutes < 0) {
        return res.status(400).json({
            status: "error",
            message: "interval_minutes cannot be negative"
        });
    }

    try {
        // Check if agent exists
        const [agents] = await db.query(
            "SELECT agent_id FROM agents WHERE agent_id = ?",
            [agent_id]
        );

        if (agents.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "Agent not found"
            });
        }

        // Insert or update provider settings
        await db.query(`
      INSERT INTO provider_settings 
        (agent_id, provider_type, specialist_count, interval_minutes)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        provider_type = VALUES(provider_type),
        specialist_count = VALUES(specialist_count),
        interval_minutes = VALUES(interval_minutes),
        updated_at = CURRENT_TIMESTAMP
    `, [agent_id, finalProviderType, finalSpecialistCount, finalIntervalMinutes]);

        res.json({
            status: "success",
            message: "Provider settings saved successfully",
            settings: {
                provider_type: finalProviderType,
                specialist_count: finalSpecialistCount,
                interval_minutes: finalIntervalMinutes
            }
        });
    } catch (error) {
        console.error("Error saving provider settings:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to save provider settings"
        });
    }
});

// GET /partner/provider-settings/:agentId - Fetch provider settings
router.get("/:agentId", async (req, res) => {
    const { agentId } = req.params;

    if (!agentId) {
        return res.status(400).json({
            status: "error",
            message: "agentId is required"
        });
    }

    try {
        const [rows] = await db.query(
            `SELECT ps.*, a.category 
             FROM provider_settings ps 
             LEFT JOIN agents a ON ps.agent_id = a.agent_id 
             WHERE ps.agent_id = ?`,
            [agentId]
        );

        if (rows.length === 0) {
            // Check if agent exists at least to return default with category
            const [agentRows] = await db.query("SELECT category FROM agents WHERE agent_id = ?", [agentId]);
            const agentCategory = agentRows.length > 0 ? agentRows[0].category : null;

            // Return default settings if not configured
            return res.json({
                status: "success",
                settings: {
                    provider_type: 'solo',
                    specialist_count: 1,
                    interval_minutes: 30,
                    is_default: true,
                    category: agentCategory
                }
            });
        }

        res.json({
            status: "success",
            settings: {
                ...rows[0],
                is_default: false
            }
        });
    } catch (error) {
        console.error("Error fetching provider settings:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to fetch provider settings"
        });
    }
});

module.exports = router;
