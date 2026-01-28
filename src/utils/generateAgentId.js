const pool = require("../config/db");

/**
 * Generate a new Agent ID in format FP00000X
 * @returns {Promise<string>}
 */
const generateAgentId = async () => {
    try {
        const [rows] = await pool.query(
            "SELECT agent_id FROM agents WHERE agent_id LIKE 'FP%' ORDER BY id DESC LIMIT 1"
        );

        if (rows.length === 0) {
            return "FP000001";
        }

        const lastId = rows[0].agent_id;
        // Extract number part
        const numberPart = parseInt(lastId.replace("FP", ""), 10);
        const newNumber = numberPart + 1;

        // Pad with zeros to length 6
        const newId = `FP${String(newNumber).padStart(6, "0")}`;
        return newId;

    } catch (error) {
        console.error("Error generating Agent ID:", error);
        throw error;
    }
};

module.exports = generateAgentId;
