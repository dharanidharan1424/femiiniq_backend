const pool = require("../../config/db");

// Helper to check if row exists
const checkAgent = async (id) => {
    const [rows] = await pool.query("SELECT * FROM agents WHERE agent_id = ?", [id]);
    return rows[0];
};

exports.updatePartnerType = async (req, res) => {
    try {
        const { partner_type } = req.body;
        await pool.query("UPDATE agents SET partner_type = ? WHERE agent_id = ?", [partner_type, req.user.agent_id]);
        res.json({ success: true, message: "Partner type updated" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updatePersonalInfo = async (req, res) => {
    try {
        const {
            full_name, dob, gender, experience_years, owner_name, salon_name,
            street, area, city, state, pincode, country, category
        } = req.body;

        // Dynamic update based on provided fields
        const updates = [];
        const values = [];

        if (full_name) { updates.push("full_name = ?"); values.push(full_name); }
        if (dob) { updates.push("dob = ?"); values.push(dob); }
        if (gender) { updates.push("gender = ?"); values.push(gender); }

        // Map experience_years to experience column
        if (experience_years) { updates.push("experience = ?"); values.push(experience_years); }

        if (owner_name) { updates.push("owner_name = ?"); values.push(owner_name); }
        if (salon_name) { updates.push("salon_name = ?"); values.push(salon_name); }

        // Address fields
        if (street) { updates.push("address_line1 = ?"); values.push(street); }
        if (area) { updates.push("address_line2 = ?"); values.push(area); }
        if (city) { updates.push("city = ?"); values.push(city); }
        if (state) { updates.push("state = ?"); values.push(state); }
        if (pincode) { updates.push("pincode = ?"); values.push(pincode); }
        if (country) { updates.push("country = ?"); values.push(country); }
        if (category) { updates.push("category = ?"); values.push(category); }
        if (req.body.image) { updates.push("image = ?"); values.push(req.body.image); }

        if (updates.length > 0) {
            values.push(req.user.agent_id);
            await pool.query(`UPDATE agents SET ${updates.join(", ")} WHERE agent_id = ?`, values);
        }
        res.json({ success: true, message: "Personal info updated" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateServiceLocation = async (req, res) => {
    try {
        // service_location codes: customer_home, salon_visit, both
        // Mapped from frontend: customer -> customer_home, provider -> salon_visit, both -> both
        let { service_location, service_location_type, travel_radius, travel_charge_per_km, travel_charge } = req.body;

        // Handle alias
        if (service_location_type) {
            if (service_location_type === 'customer') service_location = 'customer_home';
            else if (service_location_type === 'provider') service_location = 'salon_visit';
            else service_location = 'both';
        }

        if (travel_charge_per_km) travel_charge = travel_charge_per_km;

        const updates = ["service_location = ?"];
        const values = [service_location];

        if (travel_radius !== undefined) {
            updates.push("travel_radius = ?");
            values.push(travel_radius);
        }
        // Map to travel_charge column
        if (travel_charge !== undefined) {
            updates.push("travel_charge = ?");
            values.push(travel_charge);
        }

        values.push(req.user.agent_id);
        await pool.query(`UPDATE agents SET ${updates.join(", ")} WHERE agent_id = ?`, values);
        res.json({ success: true, message: "Service location updated" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.addCategories = async (req, res) => {
    try {
        const { category_ids } = req.body; // Array of IDs
        const agent_id = req.user.agent_id;

        if (!Array.isArray(category_ids)) return res.status(400).json({ error: "category_ids must be an array" });

        // Clear existing agent_categories
        await pool.query("DELETE FROM agent_categories WHERE agent_id = ?", [agent_id]);

        const selectedCategories = [];

        // Insert into agent_categories and fetch names for legacy support
        for (const catId of category_ids) {
            await pool.query("INSERT INTO agent_categories (agent_id, category_id) VALUES (?, ?)", [agent_id, catId]);

            // Fetch category name
            const [catRows] = await pool.query("SELECT label, value FROM service_categories WHERE id = ? OR value = ?", [catId, catId]);
            if (catRows.length > 0) {
                selectedCategories.push({ id: catRows[0].value, name: catRows[0].label });
            }
        }

        // Update legacy 'category' column in agents table for provider-settings compatibility
        if (selectedCategories.length > 0) {
            await pool.query("UPDATE agents SET category = ? WHERE agent_id = ?", [JSON.stringify(selectedCategories), agent_id]);
        }

        res.json({ success: true, message: "Categories updated" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.addServices = async (req, res) => {
    try {
        const { services } = req.body; // Array of service objects
        const agent_id = req.user.agent_id;

        if (!Array.isArray(services)) return res.status(400).json({ error: "services must be an array" });

        // Get agent info for denormalized fields
        const [agents] = await pool.query("SELECT name, shop_id FROM agents WHERE agent_id = ?", [agent_id]);
        const agentName = agents[0]?.name || "Partner";
        const shopId = agents[0]?.shop_id || 1;

        // Get a default staff ID (required by legacy schema)
        const [staffs] = await pool.query("SELECT id FROM staffs WHERE shop_id = ? LIMIT 1", [shopId]);
        const defaultStaffId = staffs[0]?.id || 1;

        for (const service of services) {
            // Generate max ID manually for legacy service_type table if needed, or rely on auto-increment
            // Check if service_type uses auto-increment. Assuming yes based on schema provided earlier, 
            // but Add-services.js used manual ID generation. Let's use manual to be safe as per Add-services.js pattern.
            const [maxIdResult] = await pool.query("SELECT MAX(id) as maxId FROM service_type");
            const nextId = (maxIdResult[0].maxId || 0) + 1;

            await pool.query(
                `INSERT INTO service_type 
                (id, category_id, name, price, original_price, staff_id, duration, description, procedure_desc, agent_id, agent_name, image) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    nextId,
                    service.category_id,
                    service.service_name,
                    service.price,
                    service.price, // original_price same as price for now
                    defaultStaffId,
                    service.duration,
                    service.description || "Service",
                    "Standard procedure", // procedure_desc
                    agent_id,
                    agentName,
                    service.image || null
                ]
            );
        }
        res.json({ success: true, message: "Services added" });
    } catch (error) {
        console.error("Add Services Error:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.addPackages = async (req, res) => {
    try {
        const { packages } = req.body;
        const agent_id = req.user.agent_id;

        if (!Array.isArray(packages)) return res.status(400).json({ error: "packages must be an array" });

        const [agents] = await pool.query("SELECT name, shop_id FROM agents WHERE agent_id = ?", [agent_id]);
        const agentName = agents[0]?.name || "Partner";
        const shopId = agents[0]?.shop_id || 1;
        const [staffs] = await pool.query("SELECT id FROM staffs WHERE shop_id = ? LIMIT 1", [shopId]);
        const defaultStaffId = staffs[0]?.id || 1;

        for (const pkg of packages) {
            // Manual ID generation for legacy service_package table
            const [maxIdResult] = await pool.query("SELECT MAX(id) as maxId FROM service_package");
            const nextId = (maxIdResult[0].maxId || 0) + 1;

            await pool.query(
                `INSERT INTO service_package 
                (id, category_id, name, price, description, agent_id, agent_name, staff_id, image, booked, original_price, duration, process_desc, services)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    nextId,
                    1, // Default category_id as packages might span multiple
                    pkg.package_name,
                    pkg.total_price,
                    pkg.description || "Package Deal",
                    agent_id,
                    agentName,
                    defaultStaffId,
                    "https://res.cloudinary.com/djponxjp9/image/upload/v1736230557/MobileApp/placeholder.png", // Default image
                    0, // booked
                    pkg.total_price, // original_price
                    60, // Default duration if not calc from items
                    "Standard Package Process",
                    JSON.stringify(pkg.items || []) // Store service IDs as JSON string in 'services' column
                ]
            );
        }
        res.json({ success: true, message: "Packages created" });
    } catch (error) {
        console.error("Add Packages Error:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.updateAvailability = async (req, res) => {
    try {
        const { schedule } = req.body; // Array of { day, start_time, end_time }
        const agent_id = req.user.agent_id;

        if (!Array.isArray(schedule)) return res.status(400).json({ error: "schedule must be an array" });

        await pool.query("DELETE FROM agent_availability WHERE agent_id = ?", [agent_id]);

        for (const slot of schedule) {
            await pool.query(
                `INSERT INTO agent_availability (agent_id, day, start_time, end_time) VALUES (?, ?, ?, ?)`,
                [agent_id, slot.day, slot.start_time, slot.end_time]
            );
        }
        res.json({ success: true, message: "Availability updated" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateBankDetails = async (req, res) => {
    try {
        const { account_number, ifsc_code, account_holder_name, bank_name } = req.body;
        const agent_id = req.user.agent_id;

        await pool.query(
            `INSERT INTO agent_bank_details (agent_id, account_number, ifsc_code, account_holder_name, bank_name)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
             account_number = VALUES(account_number), 
             ifsc_code = VALUES(ifsc_code), 
             account_holder_name = VALUES(account_holder_name),
             bank_name = VALUES(bank_name)`,
            [agent_id, account_number, ifsc_code, account_holder_name, bank_name]
        );
        res.json({ success: true, message: "Bank details updated" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateGovId = async (req, res) => {
    try {
        const { id_type, id_url, id_image_base64, gst_number } = req.body;
        const agent_id = req.user.agent_id;

        // Use base64 image if provided, otherwise use id_url
        const imageData = id_image_base64 || id_url;

        const updates = ["document_type = ?", "document_url = ?"];
        const values = [id_type, imageData];

        if (gst_number) {
            updates.push("gst_number = ?");
            values.push(gst_number);
        }

        values.push(agent_id);

        await pool.query(
            `UPDATE agents SET ${updates.join(", ")} WHERE agent_id = ?`,
            values
        );

        res.json({ success: true, message: "Gov ID updated" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
