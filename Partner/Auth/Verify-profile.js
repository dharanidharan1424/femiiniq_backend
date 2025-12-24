// routes/verification.js
const express = require("express");
const router = express.Router();
const db = require("../../config/dummyDb.js");

router.post("/", async (req, res) => {
  const {
    agent_id,
    agent_name,
    mobile,
    email,
    id_type,
    id_number,
    id_proof_url,
    selfie_url,
    verified,
  } = req.body;

  if (
    !agent_id ||
    !agent_name ||
    !id_type ||
    !id_number ||
    !id_proof_url ||
    !selfie_url
  ) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    const sql = `
      INSERT INTO agent_verifications 
      (agent_id, agent_name, mobile, email, id_type, id_number, id_proof_url, selfie_url, verified) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        agent_name = VALUES(agent_name),
        mobile = VALUES(mobile),
        email = VALUES(email),
        id_type = VALUES(id_type),
        id_number = VALUES(id_number),
        id_proof_url = VALUES(id_proof_url),
        selfie_url = VALUES(selfie_url),
        verified = VALUES(verified),
        updated_at = NOW()
    `;

    const [result] = await db.execute(sql, [
      agent_id,
      agent_name,
      mobile || null,
      email || null,
      id_type,
      id_number,
      id_proof_url,
      selfie_url,
      verified ? 1 : 0,
    ]);

    return res
      .status(200)
      .json({ message: "Verification details saved.", result });
  } catch (error) {
    console.error("Failed to save verification:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
});

module.exports = router;
