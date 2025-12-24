const express = require("express");
const router = express.Router();
const db = require("../config/dummyDb"); // your DB connection module

router.post("/", async (req, res) => {
  const {
    order_id,
    agent_id,
    agent_name,
    agent_mobile,
    customer_name,
    location,
    services,
    subject,
    description,
  } = req.body;

  // Validate required fields
  if (
    !order_id ||
    !agent_id ||
    !agent_name ||
    !agent_mobile ||
    !customer_name ||
    !location ||
    !services ||
    !subject ||
    !description
  ) {
    return res.status(400).json({
      error: "All fields are required.",
    });
  }

  try {
    const [result] = await db.execute(
      `INSERT INTO reports (
        order_id, agent_id, agent_name, customer_name, location, services, subject, description, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        order_id,
        agent_id,
        agent_name,
        customer_name,
        location,
        services,
        subject,
        description,
      ]
    );
    res.json({
      success: true,
      message: "Report added successfully.",
      report_id: result.insertId,
    });
  } catch (err) {
    console.error("Error adding report:", err);
    res
      .status(500)
      .json({ error: "Could not add report due to server error." });
  }
});

module.exports = router;
