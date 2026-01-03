const express = require("express");

const cors = require("cors");
const cookieParser = require("cookie-parser");
const authenticateToken = require("./middleware/authToken");
require("dotenv").config();

const app = express();

const corsOptions = {
  origin: "http://192.168.1.6:8081", // frontend origin you trust
  credentials: true, // allow cookies/credentials
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());

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
app.use("/delete-profile", authenticateToken, deleteProfileRouter);
app.use("/booking", BookingRouter);
app.use("/payments", paymentsRouter);
app.use("/reviews", ReviewRouter);
app.use("/receipt", receiptRouter);
app.use("/pass", PasswordRouter);
app.use("/notification", NotificationRouter);
app.use("/report", reportsRouter);
app.use("/bank", bankDetailsRouter);
app.use("/coupon", BookingCouponRouter);

// <-------------------------------------------------------------------------------------------------------------------->

// Routes for partners and agents
const getAgentsRouter = require("./Partner/Get-agents.js");
const partnerRegisterRouter = require("./Partner/Auth/Register.js");
const partnerLoginRouter = require("./Partner/Auth/Login.js");
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

app.use("/agent", getAgentsRouter);
app.use("/partner/register", partnerRegisterRouter);
app.use("/partner/login", partnerLoginRouter);
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
app.use("/partner/hide-profile", hideProfileRouter);

app.use("/partner/chat", ChatBlockRouter);
app.use("/partner/chat", ChatPermissionRouter);

// <---------------------------------------------------------REAL DATA INTEGRATION----------------------------------------------------------->
const bookingsRouter = require("./Real-data/Bookings/bookings.js");

app.use("/real-data", bookingsRouter);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
