const express = require("express");
const router = express.Router();
const db = require("../config/dummyDb");

// GET /partner/agent-categories/:agent_id
router.get("/:agent_id", async (req, res) => {
    const { agent_id } = req.params;

    if (!agent_id) {
        return res.status(400).json({ status: "error", message: "agent_id is required" });
    }

    try {

        const [results] = await db.query(
            "SELECT ac.category_id, sc.name FROM agent_categories ac JOIN service_categories sc ON ac.category_id = sc.id WHERE ac.agent_id = ?",
            [agent_id]
        );

        res.json({
            status: "success",
            categories: results || []
        });
    } catch (error) {
        console.error("Error fetching agent categories:", error);
        res.status(500).json({ status: "error", message: "Failed to fetch categories" });
    }
});

module.exports = router;
