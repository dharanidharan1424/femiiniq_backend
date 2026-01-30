const express = require("express");
const router = express.Router();
const db = require("../config/dummyDb.js");

// POST /partner/add (Added for onboarding robustness - using agent_services)
router.post("/", async (req, res) => {
  console.log("📥 Onboarding Add Service Request Received:", req.body);
  try {
    const { agent_id, name, price, duration, category_id, image } = req.body;

    if (!agent_id || !name || price === undefined || !duration) {
      return res.status(400).json({ status: "error", message: "Missing required fields for service addition." });
    }

    const query = `
      INSERT INTO agent_services
      (agent_id, category_id, service_name, price, duration, description, image)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      agent_id,
      category_id || 1,
      name,
      price,
      duration,
      'New service added',
      image || null
    ];

    console.log("📝 Executing Insert query with values:", values);
    await db.query(query, values);
    console.log("✅ Service added successfully to agent_services.");

    return res.status(201).json({ status: "success", message: "Service added successfully" });
  } catch (error) {
    console.error("Onboarding Add Service Error:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// POST /partner/add/staff (Using specialists table)
router.post("/staff", async (req, res) => {
  console.log("📥 Add Staff Request Received:", req.body);
  try {
    const { agent_id, name, image, specialty } = req.body;

    if (!agent_id || !name) {
      return res.status(400).json({ status: "error", message: "Missing required fields for staff addition." });
    }

    const query = `
      INSERT INTO specialists (agent_id, name, image, category)
      VALUES (?, ?, ?, ?)
    `;

    const values = [
      agent_id,
      name,
      image || 'https://res.cloudinary.com/djponxjp9/image/upload/v1736230557/MobileApp/placeholder.png',
      specialty || 'Professional Specialist'
    ];

    console.log("📝 Executing Specialist Insert query with values:", values);
    const [result] = await db.query(query, values);
    console.log("✅ Specialist added successfully to DB.");

    return res.status(201).json({ status: "success", id: result.insertId, message: "Specialist added successfully" });
  } catch (error) {
    console.error("Add Staff Error:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// ✅ UPDATE Specialist (Using specialists table)
router.post("/staff/update", async (req, res) => {
  try {
    const {
      staffId,
      agent_id,
      name,
      image,
      specialty
    } = req.body;

    if (!staffId || !agent_id || !name) {
      return res.status(400).json({ status: "error", message: "Missing required fields (staffId, agent_id, name)." });
    }

    const updateQuery = `
      UPDATE specialists SET
        name = ?,
        image = ?,
        category = ?
      WHERE id = ? AND agent_id = ?
    `;

    const values = [
      name,
      image || 'https://res.cloudinary.com/djponxjp9/image/upload/v1736230557/MobileApp/placeholder.png',
      specialty || 'Professional Specialist',
      staffId,
      agent_id
    ];

    const [updateResult] = await db.query(updateQuery, values);

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "Staff member not found or unauthorized.",
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Staff member updated successfully.",
    });
  } catch (error) {
    console.error("Update Staff API Error:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// POST /partner/add/service (Using agent_services)
router.post("/service", async (req, res) => {
  try {
    const {
      category_id,
      name,
      price,
      duration,
      description,
      agent_id,
      image,
    } = req.body;

    if (
      !category_id ||
      !name ||
      !price ||
      !duration ||
      !agent_id
    ) {
      return res
        .status(400)
        .json({ status: "error", message: "Missing required fields (cat, name, price, duration, agent_id)." });
    }

    const query = `
      INSERT INTO agent_services
      (agent_id, category_id, service_name, price, duration, description, image)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      agent_id,
      category_id,
      name,
      price,
      duration,
      description || "Service",
      image || null,
    ];

    const [result] = await db.query(query, values);
    return res.status(201).json({ status: "success", id: result.insertId });
  } catch (error) {
    console.error("Add Service API Error:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// Update SERVICES (Using agent_services)
router.post("/service/update/", async (req, res) => {
  const {
    serviceId,
    category_id,
    name,
    price,
    duration,
    description,
    agent_id,
    image,
  } = req.body;

  if (
    !serviceId ||
    !agent_id ||
    !category_id ||
    !name ||
    !price ||
    !duration
  ) {
    return res
      .status(400)
      .json({ status: "error", message: "Missing required fields." });
  }

  try {
    const updateQuery = `
      UPDATE agent_services SET
        category_id = ?,
        service_name = ?,
        price = ?,
        duration = ?,
        description = ?,
        image = ?
      WHERE id = ? AND agent_id = ?
    `;
    const values = [
      category_id,
      name,
      price,
      duration,
      description || "Service",
      image || null,
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
    console.error("Update Service API Error:", error);
    res.status(500).json({ status: "error", message: "Database query failed" });
  }
});

// ✅ POST /partner/add/package  → Create a new service package (agent_packages)
router.post("/package", async (req, res) => {
  try {
    const {
      name,
      price,
      description,
      agent_id,
      services,
      image,
    } = req.body;

    if (
      !name ||
      !price ||
      !agent_id
    ) {
      return res
        .status(400)
        .json({ status: "error", message: "Missing required fields." });
    }

    const query = `
      INSERT INTO agent_packages
      (agent_id, package_name, total_price, description, services, image)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const values = [
      agent_id,
      name,
      price,
      description || "Package Deal",
      services || "[]",
      image || null,
    ];

    const [result] = await db.query(query, values);

    res.status(201).json({
      status: "success",
      id: result.insertId,
      message: "Service package created successfully.",
    });
  } catch (error) {
    console.error("Add Package API Error:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
});

// ✅ UPDATE Service Package (Using agent_packages)
router.post("/package/update", async (req, res) => {
  try {
    const {
      packageId,
      name,
      price,
      description,
      agent_id,
      services,
      image,
    } = req.body;

    if (
      !packageId ||
      !agent_id ||
      !name ||
      !price
    ) {
      return res
        .status(400)
        .json({ status: "error", message: "Missing required fields." });
    }

    const updateQuery = `
      UPDATE agent_packages SET
        package_name = ?,
        total_price = ?,
        description = ?,
        services = ?,
        image = ?
      WHERE id = ? AND agent_id = ?
    `;

    const values = [
      name,
      price,
      description || "Package Deal",
      services || "[]",
      image || null,
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

    return res.status(200).json({
      status: "success",
      message: "Service package updated successfully.",
    });
  } catch (error) {
    console.error("Update Package API Error:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
});

module.exports = router;
