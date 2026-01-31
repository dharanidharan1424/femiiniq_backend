const pool = require("../../config/db");

const toggleStatus = async (req, res) => {
    const { agent_id, status } = req.body;

    if (!agent_id || !status) {
        return res.status(400).json({ status: "error", message: "Agent ID and status are required." });
    }

    try {
        const query = "UPDATE agents SET status = ? WHERE agent_id = ?";
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

const getVerificationStatus = async (req, res) => {
    try {
        const { agent_id, id } = req.user;
        console.log(`[Verification] Fetching status. agent_id: ${agent_id}, numeric id: ${id}`);

        // Try searching by agent_id (string) first
        let [rows] = await pool.query(
            "SELECT * FROM agents WHERE agent_id = ?",
            [agent_id]
        );

        // Fallback to numeric id if not found
        if (rows.length === 0 && id) {
            console.log(`[Verification] Not found by agent_id, trying numeric id: ${id}`);
            [rows] = await pool.query(
                "SELECT * FROM agents WHERE id = ?",
                [id]
            );
        }

        if (rows.length === 0) {
            console.log(`[Verification] No agent found by agent_id (${agent_id}) or numeric id (${id})`);
            return res.json({ success: true, data: null, message: "No verification data found" });
        }

        const agent = rows[0];
        console.log(`[Verification] Row found. Available keys:`, Object.keys(agent).join(', '));

        const data = {
            document_type: agent.document_type || agent.documenttype || "",
            document_url: agent.document_url || agent.documenturl || "",
            gst_number: agent.gst_number || agent.gstnumber || "",
            adminverifystatus: agent.adminverifystatus || agent.admin_verify_status || "pending"
        };

        res.json({ success: true, data });
    } catch (error) {
        console.error(`[Verification] Error:`, error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const getBankDetails = async (req, res) => {
    try {
        const { agent_id, id } = req.user;
        console.log(`[BankDetails] Fetching for agent_id: ${agent_id}, numeric id: ${id}`);

        // Try searching by agent_id (string) first
        let [rows] = await pool.query(
            "SELECT * FROM agent_bank_details WHERE agent_id = ?",
            [agent_id]
        );

        // Fallback to numeric id if not found? 
        // Usually agent_bank_details uses whatever was inserted during onboarding.
        // Let's stick with agent_id for now as onboarding uses it.

        if (rows.length === 0) {
            return res.json({ success: true, data: null, message: "No bank details found" });
        }

        res.json({ success: true, data: rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    toggleStatus,
    getBankDetails,
    getVerificationStatus
};
