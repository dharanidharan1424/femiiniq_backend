const pool = require("../../config/db");

const toggleStatus = async (req, res) => {
    const { agent_id, status } = req.body;

    if (!agent_id || !status) {
        return res.status(400).json({ status: "error", message: "Agent ID and status are required." });
    }

    try {
        const query = "UPDATE agents SET status = ?, updated_at = NOW() WHERE agent_id = ?";
        const [result] = await pool.query(query, [status, agent_id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ status: "error", message: "Agent not found." });
        }

        return res.status(200).json({
            status: "success",
            message: `Status updated to ${status}`,
            data: { status }
        });
    } catch (error) {
        console.error("Error updating status:", error);
        return res.status(500).json({ status: "error", message: "Internal server error." });
    }
};

module.exports = {
    toggleStatus
};
