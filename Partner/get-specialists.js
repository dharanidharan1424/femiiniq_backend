// GET specialists for a specific agent (Using specialists table)
router.get("/:agent_id", async (req, res) => {
    const { agent_id } = req.params;

    if (!agent_id) {
        return res.status(400).json({
            status: "error",
            message: "agent_id is required"
        });
    }

    try {
        const [specialists] = await db.query(
            "SELECT * FROM specialists WHERE agent_id = ?",
            [agent_id]
        );

        return res.json({
            status: "success",
            specialists: specialists || []
        });
    } catch (error) {
        console.error("Error fetching specialists from specialists table:", error);
        return res.status(500).json({
            status: "error",
            message: "Failed to fetch specialists"
        });
    }
});

module.exports = router;
