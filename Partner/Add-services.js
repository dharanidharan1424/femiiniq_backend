const express = require("express");
const router = express.Router();
const db = require("../config/dummyDb.js");

// POST /api/services
router.post("/service", async (req, res) => {
  try {
    const {
      category_id,
      name,
      image,
      price,
      original_price,
      staff_id,
      duration,
      description,
      procedure_desc,
      agent_id,
      agent_name,
    } = req.body;

    if (
      !category_id ||
      !name ||
      !image ||
      !price ||
      !original_price ||
      !staff_id ||
      !duration ||
      !description ||
      !procedure_desc ||
      !agent_id ||
      !agent_name
    ) {
      return res
        .status(400)
        .json({ status: "error", message: "Missing required fields." });
    }

    const query = `
      INSERT INTO service_type
      (category_id, name, image, price, original_price, staff_id, duration, description, procedure_desc, agent_id, agent_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      category_id,
      name,
      image,
      price,
      original_price,
      staff_id,
      duration,
      description,
      procedure_desc,
      agent_id,
      agent_name,
    ];

    // Assuming mysql2 with promise-ready pool/connection
    const [result] = await db.query(query, values);

    return res.status(201).json({ status: "success", id: result.insertId });
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// Update SERVICES
router.post("/service/update/", async (req, res) => {
  const {
    serviceId,
    category_id,
    name,
    image,
    price,
    original_price,
    staff_id,
    duration,
    description,
    procedure_desc,
    agent_id, // optional or required, your choice
  } = req.body;

  // Basic validation (omit agent_name check if optional)
  if (
    !serviceId ||
    !agent_id ||
    !category_id ||
    !name ||
    !image ||
    !price ||
    !original_price ||
    !staff_id ||
    !duration ||
    !description ||
    !procedure_desc
  ) {
    return res
      .status(400)
      .json({ status: "error", message: "Missing required fields." });
  }

  try {
    // Optionally verify agent exists first
    const [agents] = await db.query("SELECT * FROM agents WHERE agent_id = ?", [
      agent_id,
    ]);
    if (agents.length === 0) {
      return res
        .status(404)
        .json({ status: "error", message: "Agent not found." });
    }

    // Perform update using promise-based query
    const updateQuery = `
      UPDATE service_type SET
        category_id = ?,
        name = ?,
        image = ?,
        price = ?,
        original_price = ?,
        staff_id = ?,
        duration = ?,
        description = ?,
        procedure_desc = ?
      WHERE id = ? AND agent_id = ?
    `;
    const values = [
      category_id,
      name,
      image,
      price,
      original_price,
      staff_id,
      duration,
      description,
      procedure_desc,
      serviceId,
      agent_id,
    ];

    const [updateResult] = await db.query(updateQuery, values);

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "Service not found or unauthorized",
      });
    }

    res
      .status(200)
      .json({ status: "success", message: "Service updated successfully" });
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ status: "error", message: "Database query failed" });
  }
});

// ✅ POST /api/service_package  → Create a new service package
router.post("/package", async (req, res) => {
  console.log(req.body);
  try {
    const {
      category_id,
      name,
      price,
      description,
      agent_id,
      agent_name,
      staff_id,
      image,
      booked,
      original_price,
      duration,
      process_desc,
      services,
    } = req.body;

    if (
      !category_id ||
      !name ||
      !price ||
      !description ||
      !agent_id ||
      !agent_name ||
      !staff_id ||
      !image ||
      original_price === undefined ||
      !duration ||
      !process_desc
    ) {
      return res
        .status(400)
        .json({ status: "error", message: "Missing required fields." });
    }

    const query = `
  INSERT INTO service_package
  (category_id, name, price, description, agent_id, agent_name, staff_id, image, booked, original_price, duration, process_desc, services)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

    const values = [
      category_id,
      name,
      price,
      description,
      agent_id,
      agent_name,
      staff_id,
      image,
      booked || 0,
      original_price,
      duration,
      process_desc,
      services || "[]", // <--- ADD services column here, default to "[]"
    ];

    // Assuming you have mysql2's promise pool or connection available as db
    const [result] = await db.query(query, values);

    res.status(201).json({
      status: "success",
      id: result.insertId,
      message: "Service package created successfully.",
    });
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// ✅ UPDATE Service Package (Promise-based)
router.post("/package/update", async (req, res) => {
  console.log(req.body);
  try {
    const {
      packageId,
      category_id,
      name,
      price,
      description,
      agent_id,
      staff_id,
      image,
      booked,
      original_price,
      duration,
      process_desc,
      services,
    } = req.body;

    // Basic validation
    if (
      !packageId ||
      !agent_id ||
      !category_id ||
      !name ||
      !price ||
      !description ||
      !staff_id ||
      !image ||
      original_price === undefined ||
      !duration ||
      !process_desc
    ) {
      return res
        .status(400)
        .json({ status: "error", message: "Missing required fields." });
    }

    // ✅ Check if the agent exists
    const [agentRows] = await db.query(
      "SELECT * FROM agents WHERE agent_id = ?",
      [agent_id]
    );

    if (agentRows.length === 0) {
      return res
        .status(404)
        .json({ status: "error", message: "Agent not found." });
    }

    // ✅ Update query using Promise-based syntax
    const updateQuery = `
  UPDATE service_package SET
    category_id = ?,
    name = ?,
    price = ?,
    description = ?,
    staff_id = ?,
    image = ?,
    booked = ?,
    original_price = ?,
    duration = ?,
    process_desc = ?,
    services = ?        -- <--- ADD services to update!
  WHERE id = ? AND agent_id = ?
`;

    const values = [
      category_id,
      name,
      price,
      description,
      staff_id,
      image,
      booked || 0,
      original_price,
      duration,
      process_desc,
      services || "[]", // <--- Add here as well
      packageId,
      agent_id,
    ];

    const [updateResult] = await db.query(updateQuery, values);

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "Package not found or unauthorized to update.",
      });
    }

    // ✅ Success Response
    return res.status(200).json({
      status: "success",
      message: "Service package updated successfully.",
    });
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
});

module.exports = router;
