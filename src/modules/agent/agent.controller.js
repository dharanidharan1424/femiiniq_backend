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

const getBankDetails = async (req, res) => {
    try {
        const agent_id = req.user.agent_id;

        const [rows] = await pool.query(
            "SELECT * FROM agent_bank_details WHERE agent_id = ?",
            [agent_id]
        );

        if (rows.length === 0) {
            return res.json({ success: true, data: null, message: "No bank details found" });
        }

        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

const getVerificationStatus = async (req, res) => {
    try {
        const agent_id = req.user.agent_id;
        console.log(`[Verification] Fetching status for agent: ${agent_id}`);

        const [rows] = await pool.query(
            "SELECT * FROM agents WHERE agent_id = ?",
            [agent_id]
        );

        if (rows.length === 0) {
            console.log(`[Verification] No agent found with id: ${agent_id}`);
            return res.json({ success: true, data: null, message: "No verification data found" });
        }

        const agent = rows[0];
        console.log(`[Verification] Agent data keys:`, Object.keys(agent));

        // Use the columns we found, favoring underscores but falling back to non-underscores
        const data = {
            document_type: agent.document_type || agent.documenttype || "",
            document_url: agent.document_url || agent.documenturl || "",
            gst_number: agent.gst_number || agent.gstnumber || "",
            adminverifystatus: agent.adminverifystatus || "pending"
        };

        res.json({ success: true, data });
    } catch (error) {
        console.error(`[Verification] Error:`, error);
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    toggleStatus,
    getBankDetails,
    getVerificationStatus
};
