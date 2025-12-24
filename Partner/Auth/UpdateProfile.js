const express = require("express");
const router = express.Router();
const db = require("../../config/dummyDb.js");
const dayjs = require("dayjs");

router.post("/", async (req, res) => {
  // Destructure expected fields directly from req.body.agentProfile
  const agentProfile = req.body.agentProfile || {};

  const {
    agent_id,
    full_name, // note: use full_name from DB object, fallback to fullname if needed
    fullname,
    imageUrl,
    about,
    email,
    about_desc,
    status,
    dob,
    mobile,
    gender,
    address,
    country,
    latitude,
    longitude,
    serviceId,
    serviceType,
    service_mode,
    workingHourFrom,
    workingHourTo,
    experience,
    travelRadius,
    addressVisibility,
    category,
  } = agentProfile;

  // Compose address string

  // Use either full_name or fullname for full_name field
  const nameToUse = full_name || fullname || "Unknown";

  // Use current datetime or created_at (if you want to update this only once, you may omit updating it here)
  const currentDateTime = dayjs().toDate();
  // Inside your SQL update query, comment out latitude and longitude lines:
  const agentUpdateSql = `
    UPDATE agents SET
      full_name = ?,
      image = ?,
      about_desc = ?,
      status = ?,
      dob = ?,
      email = ?,
      mobile = ?,
      gender = ?,
      address = ?,
      address_visibility = ?,  /* added column */
      country = ?,
      created_at = ?,
      service_id = ?,
      service_type = ?,
      service_mode = ?,
      work_start = ?,
      work_end = ?,
      travel_radius = ?,
      experience = ? ,
        category = ?   
    WHERE agent_id = ?;
`;

  // Comment out latitude and longitude in parameters:
  const agentUpdateParams = [
    nameToUse,
    imageUrl || null,
    about_desc || about || "",
    status || "Available",
    dob || null,
    email || null,
    mobile || null,
    gender || null,
    address || null, // new formatted address
    addressVisibility || "full", // new field
    country || "India",
    currentDateTime,
    serviceId || null,
    serviceType || null,
    service_mode || null,
    workingHourFrom || null,
    workingHourTo || null,
    travelRadius || null,
    experience || null,
    category || null,
    agent_id,
  ];

  try {
    await db.execute(agentUpdateSql, agentUpdateParams);

    res.json({ success: true, message: "Profile updated successfully" });
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ error: "Could not update profile." });
  }
});

module.exports = router;
