const express = require("express");
const router = express.Router();
const db = require("../../config/dummyDb.js");
const dayjs = require("dayjs");

router.post("/", async (req, res) => {
  // console.log("Incoming Update Profile Request:", JSON.stringify(req.body, null, 2));
  // Destructure expected fields directly from req.body.agentProfile
  const agentProfile = req.body.agentProfile || {};
  const agent_id = req.body.agent_id || agentProfile.agent_id;

  if (!agent_id) {
    return res.status(400).json({ error: "Agent ID is required" });
  }

  // Map frontend fields to database columns
  const fieldMap = {
    full_name: agentProfile.full_name || agentProfile.fullname,
    image: agentProfile.imageUrl,
    about_desc: agentProfile.about_desc || agentProfile.about,
    status: agentProfile.status,
    dob: agentProfile.dob,
    email: agentProfile.email,
    mobile: agentProfile.mobile,
    gender: agentProfile.gender,
    address: agentProfile.address,
    address_visibility: agentProfile.addressVisibility,
    country: agentProfile.country,
    service_id: agentProfile.serviceId,
    service_type: agentProfile.serviceType,
    service_mode: agentProfile.service_mode,
    work_start: agentProfile.workingHourFrom,
    work_end: agentProfile.workingHourTo,
    travel_radius: agentProfile.travelRadius,
    experience: agentProfile.experience,
    category: agentProfile.category,
    latitude: agentProfile.latitude,
    longitude: agentProfile.longitude,
    state: agentProfile.state,
    city: agentProfile.city,
    address_line1: agentProfile.addressLine1,
    address_line2: agentProfile.addressLine2,
    address_line3: agentProfile.addressLine3,
    landmark: agentProfile.landmark,
    pincode: agentProfile.pincode,
    hide_profile: agentProfile.hideProfile,
  };

  // Filter out undefined fields to build dynamic query
  const updates = [];
  const params = [];

  Object.keys(fieldMap).forEach(key => {
    if (fieldMap[key] !== undefined) {
      updates.push(`${key} = ?`);
      params.push(fieldMap[key]);
    }
  });

  if (updates.length === 0) {
    return res.json({ success: true, message: "No fields to update" });
  }

  // Add updated_at if your schema has it (optional)
  // updates.push("updated_at = NOW()");

  const sql = `UPDATE agents SET ${updates.join(", ")} WHERE agent_id = ?`;
  params.push(agent_id);

  try {
    await db.execute(sql, params);
    res.json({ success: true, message: "Profile updated successfully" });
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ error: "Could not update profile" });
  }
});

module.exports = router;
