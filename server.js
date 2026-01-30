const express = require("express");

const cors = require("cors");
const cookieParser = require("cookie-parser");
const authenticateToken = require("./middleware/authToken");
require("dotenv").config();

const app = express();

const corsOptions = {
  origin: true, // Allow all origins for troubleshooting
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Import routers
const apiRouter = require("./routes/ApiRoutes");
const loginRouter = require("./api/Auth/Login.js");
const registerRouter = require("./api/Auth/Register.js");
const updateProfileRouter = require("./api/update-profile.js");
const deleteProfileRouter = require("./api/delete-account.js");
const logoutRouter = require("./api/Auth/Logout.js");
const BookingRouter = require("./api/booking/booking.js");
const paymentsRouter = require("./api/booking/payments.js");
const ReviewRouter = require("./api/UserReview.js");
const receiptRouter = require("./api/booking/reciept.js");
const OtpRouter = require("./api/Auth/Otp.js");
const PasswordRouter = require("./api/change-password.js");
const NotificationRouter = require("./api/send-notification.js");
const reportsRouter = require("./api/report-user.js");
const bankDetailsRouter = require("./api/account-details.js");
const BookingCouponRouter = require("./api/booking/coupon.js");

// Mount routers with prefixes
app.use("/api", apiRouter);
app.use("/login", loginRouter);
app.use("/register", registerRouter);
app.use("/logout", logoutRouter);
app.use("/otp", OtpRouter);
app.use("/update-profile", updateProfileRouter);
app.use("/delete-account", authenticateToken, deleteProfileRouter);
app.use("/booking", BookingRouter);
app.use("/payments", paymentsRouter);
app.use("/reviews", ReviewRouter);
app.use("/receipt", receiptRouter);
app.use("/pass", PasswordRouter);
app.use("/notification", NotificationRouter);
app.use("/report", reportsRouter);
app.use("/bank", bankDetailsRouter);
app.use("/coupon", BookingCouponRouter);
const autoRegisterRouter = require("./api/Auth/AutoRegister.js");
app.use("/api/auth/auto-register", autoRegisterRouter);

// <-------------------------------------------------------------------------------------------------------------------->

// Routes for partners and agents
const getAgentsRouter = require("./Partner/Get-agents.js");
const partnerRegisterRouter = require("./Partner/Auth/Register.js");
const partnerLoginRouter = require("./Partner/Auth/Login.js");
const partnerLoginMobileRouter = require("./Partner/Auth/LoginMobile.js");
const partnerOtpRouter = require("./Partner/Auth/OtpAuth.js");
const partnerUpdateRouter = require("./Partner/Auth/UpdateProfile.js");
const statusUpdateRouter = require("./Partner/Availability.js");
const agentOrderRouter = require("./Partner/get-orders.js");
const agentRescheduleRouter = require("./Partner/Order/Reschedule.js");
const userRouter = require("./Partner/get-user.js");
const orderStatusRouter = require("./Partner/Order/StatusUpdate.js");
const getReviewRouter = require("./Partner/get-reviews.js");
const reportRouter = require("./Partner/Reports.js");
const getAvailabilityRouter = require("./Partner/get-availability.js");
const noteUpdateRouter = require("./Partner/Order/personal-note.js");
const addServiceRouter = require("./Partner/Add-services.js");
const getServiceRouter = require("./Partner/GetServices.js");
const deleteServiceRouter = require("./Partner/Delete-services.js");
const agentVerifyRouter = require("./Partner/Auth/Verify-profile.js");
const reviewReplyRouter = require("./Partner/agent-review.js");
const addGalleryRouter = require("./Partner/add-gallery.js");
const agentBankDetailsRouter = require("./Partner/bank-details.js");
const hideProfileRouter = require("./Partner/Auth/hide_profile.js");
const ChatBlockRouter = require("./Partner/Chat/Blockeduser.js");
const ChatPermissionRouter = require("./Partner/Chat/ChatPermission.js");
const providerSettingsRouter = require("./Partner/provider-settings.js");
const availabilitySlotsRouter = require("./Partner/availability-slots.js");
const getAvailableSlotsRouter = require("./api/get-available-slots.js");
const partnerDeleteAccountRouter = require("./Partner/delete-account.js");
const widgetLoginRouter = require("./Partner/Auth/WidgetLogin.js");

app.use("/agent", getAgentsRouter);
app.use("/partner/register", partnerRegisterRouter);
app.use("/partner/login", partnerLoginRouter);
app.use("/partner/login-with-mobile", partnerLoginMobileRouter);
app.use("/partner/otp", partnerOtpRouter);
app.use("/partner/update", partnerUpdateRouter);
app.use("/partner/status", statusUpdateRouter);
app.use("/partner/order", agentOrderRouter);
app.use("/partner/order", orderStatusRouter);
app.use("/partner/user", userRouter);
app.use("/partner/reschedule", agentRescheduleRouter);
app.use("/partner/reviews", getReviewRouter);
app.use("/partner/report", reportRouter);
app.use("/partner/avail", getAvailabilityRouter);
app.use("/partner/note", noteUpdateRouter);
app.use("/partner/add", addServiceRouter);
app.use("/partner/get", getServiceRouter);
app.use("/partner/delete", deleteServiceRouter);
app.use("/partner/verify", agentVerifyRouter);
app.use("/partner/reply", reviewReplyRouter);
app.use("/partner/gallery", addGalleryRouter);
app.use("/partner/bank", agentBankDetailsRouter);
app.use("/partner/bank", agentBankDetailsRouter);
const getCategoriesRouter = require("./Partner/Get-categories.js");
app.use("/partner/categories", getCategoriesRouter);
const dashboardRouter = require("./Partner/dashboard.js");
app.use("/partner/dashboard", dashboardRouter);
app.use("/partner/hide-profile", hideProfileRouter);

app.use("/partner/chat", ChatBlockRouter);
app.use("/partner/chat", ChatPermissionRouter);

// New availability system routes
app.use("/partner/provider-settings", providerSettingsRouter);
const workingHoursRouter = require("./Partner/working-hours.js");
app.use("/partner/availability", workingHoursRouter);
app.use("/partner/availability", availabilitySlotsRouter);
app.use("/api/booking/available-slots", getAvailableSlotsRouter);

// Partner account deletion
app.use("/delete-agentProfile", partnerDeleteAccountRouter);

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Get specialists for a shop
const getSpecialistsRouter = require("./Partner/get-specialists.js");
app.use("/partner/get-specialists", getSpecialistsRouter);

// <---------------------------------------------------------REAL DATA INTEGRATION----------------------------------------------------------->
const bookingsRouter = require("./Real-data/Bookings/bookings.js");

app.use("/real-data", bookingsRouter);

// <---------------------------------------------------------NEW BACKEND ARCHITECTURE----------------------------------------------------------->
const newAuthRouter = require("./src/modules/auth/auth.routes");
const newOnboardingRouter = require("./src/modules/onboarding/onboarding.routes");
const newAgentRouter = require("./src/modules/agent/agent.routes");
const travelSettingsRouter = require("./src/modules/partner/travel-settings.routes");

// Mount new routes
app.use("/api/v2/auth", newAuthRouter);
app.use("/api/v2/onboarding", newOnboardingRouter);
app.use("/api/v2/agent", newAgentRouter);
app.use("/api/v2/partner/travel-settings", travelSettingsRouter);


// Start server
// Start server
const PORT = process.env.PORT || 3000;

// AUTO-MIGRATION: Self-Healing Database
const pool = require("./config/db");
async function runAutoMigration() {
  try {
    console.log("⚙️ Running Auto-Migration...");

    // 1. Fix Status Column
    console.log("-> Updating 'agents' status column...");
    try {
      await pool.query(`
                ALTER TABLE agents 
                MODIFY COLUMN status 
                ENUM('Available', 'Busy', 'Offline', 'Unavailable', 'Not Available', 'Pending Onboarding') 
                NOT NULL DEFAULT 'Available'
            `);
      console.log("   ✅ Status column updated.");
    } catch (e) { console.log("   ℹ️ Status update skipped/failed (likely already done)."); }

    // 2. Create provider_settings table
    console.log("-> Checking/Creating 'provider_settings' table...");
    await pool.query(`
            CREATE TABLE IF NOT EXISTS provider_settings (
                id INT PRIMARY KEY AUTO_INCREMENT,
                agent_id VARCHAR(50) NOT NULL UNIQUE,
                provider_type ENUM('solo', 'studio') NOT NULL DEFAULT 'solo',
                specialist_count INT DEFAULT 1,
                interval_minutes INT DEFAULT 30,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_agent_id (agent_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
    console.log("   ✅ 'provider_settings' table ready.");

    // 3. Create agent_working_hours table
    console.log("-> Checking/Creating 'agent_working_hours' table...");
    await pool.query(`
        CREATE TABLE IF NOT EXISTS agent_working_hours (
            id INT PRIMARY KEY AUTO_INCREMENT,
            agent_id VARCHAR(50) NOT NULL,
            day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') NOT NULL,
            is_closed BOOLEAN DEFAULT FALSE,
            start_time TIME DEFAULT '09:00:00',
            end_time TIME DEFAULT '18:00:00',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_agent_day (agent_id, day_of_week)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("   ✅ 'agent_working_hours' table ready.");

    // 4. Create availability_slots table
    console.log("-> Checking/Creating 'availability_slots' table...");
    await pool.query(`
        CREATE TABLE IF NOT EXISTS availability_slots (
            id INT PRIMARY KEY AUTO_INCREMENT,
            agent_id VARCHAR(50) NOT NULL,
            date DATE NOT NULL,
            start_time TIME NOT NULL,
            end_time TIME NOT NULL,
            is_available BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY unique_slot (agent_id, date, start_time)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("   ✅ 'availability_slots' table ready.");

    // 5. Create booking_slots table
    console.log("-> Checking/Creating 'booking_slots' table...");
    await pool.query(`
        CREATE TABLE IF NOT EXISTS booking_slots (
            id INT PRIMARY KEY AUTO_INCREMENT,
            agent_id VARCHAR(50) NOT NULL,
            date DATE NOT NULL,
            start_time TIME NOT NULL,
            end_time TIME NOT NULL,
            total_capacity INT DEFAULT 1,
            booked_count INT DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY unique_booking_slot (agent_id, date, start_time)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("   ✅ 'booking_slots' table ready.");

    // 6. Ensure Agents Table Columns (Self-Healing)
    console.log("-> Checking 'agents' table columns...");
    try {
      const connection = await pool.getConnection();
      // Check/Add partner_type
      try {
        await connection.query("ALTER TABLE agents ADD COLUMN partner_type ENUM('solo', 'studio') DEFAULT 'solo'");
        console.log("   ✅ Added 'partner_type' column.");
      } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') console.log("   Info: partner_type check skipped."); }

      // Check/Add owner_name
      try {
        await connection.query("ALTER TABLE agents ADD COLUMN owner_name VARCHAR(255)");
        console.log("   ✅ Added 'owner_name' column.");
      } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') console.log("   Info: owner_name check skipped."); }

      // Check/Add salon_name
      try {
        await connection.query("ALTER TABLE agents ADD COLUMN salon_name VARCHAR(255)");
        console.log("   ✅ Added 'salon_name' column.");
      } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') console.log("   Info: salon_name check skipped."); }

      // Ensure service_location is VARCHAR(50)
      try {
        await connection.query("ALTER TABLE agents MODIFY COLUMN service_location VARCHAR(50) DEFAULT 'both'");
        console.log("   ✅ Ensured 'service_location' is VARCHAR.");
      } catch (e) { console.log("   Info: service_location modify skipped."); }

      // Check/Add refresh_token
      try {
        await connection.query("ALTER TABLE agents ADD COLUMN refresh_token TEXT DEFAULT NULL");
        console.log("   ✅ Added 'refresh_token' column.");
      } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') console.log("   Info: refresh_token check skipped."); }

      // Check/Add gst_number
      try {
        await connection.query("ALTER TABLE agents ADD COLUMN gst_number VARCHAR(50) DEFAULT NULL");
        console.log("   ✅ Added 'gst_number' column.");
      } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') console.log("   Info: gst_number check skipped."); }

      connection.release();
    } catch (e) {
      console.log("   ⚠️ Column check execution error:", e.message);
    }

    // 7. Check Gov ID Columns
    console.log("-> Checking 'agents' Gov ID columns...");
    try {
      const connection = await pool.getConnection();
      try {
        await connection.query("ALTER TABLE agents ADD COLUMN document_type VARCHAR(50) DEFAULT NULL");
        console.log("   ✅ Added 'document_type' column.");
      } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') console.log("   Info: document_type check skipped."); }

      try {
        await connection.query("ALTER TABLE agents ADD COLUMN document_url TEXT DEFAULT NULL");
        console.log("   ✅ Added 'document_url' column.");
      } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') console.log("   Info: document_url check skipped."); }

      // Modify document_url to MEDIUMTEXT to support base64 images
      try {
        await connection.query("ALTER TABLE agents MODIFY COLUMN document_url MEDIUMTEXT");
        console.log("   ✅ Modified 'document_url' to MEDIUMTEXT for base64 support.");
      } catch (e) { console.log("   Info: document_url modification skipped:", e.message); }

      connection.release();
    } catch (e) { console.log("   ⚠️ Gov ID check error:", e.message); }

    // 8. Create agent_bank_details table
    console.log("-> Checking/Creating 'agent_bank_details' table...");
    await pool.query(`
        CREATE TABLE IF NOT EXISTS agent_bank_details (
            id INT PRIMARY KEY AUTO_INCREMENT,
            agent_id VARCHAR(50) NOT NULL UNIQUE,
            account_number VARCHAR(50),
            ifsc_code VARCHAR(20),
            account_holder_name VARCHAR(100),
            bank_name VARCHAR(100),
            is_verified BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (agent_id) REFERENCES agents(agent_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log("   ✅ 'agent_bank_details' table ready.");

    console.log("✨ Auto-Migration Complete.");
  } catch (error) {
    console.error("⚠️ Auto-Migration Warning:", error.message);
  }
}
runAutoMigration();

app.use((req, res) => {
  console.log(`[404] ${req.method} ${req.url} - Not Handled`);
  res.status(404).json({ error: "Route Not Found", path: req.url });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
