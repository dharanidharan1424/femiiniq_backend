const express = require("express");
const router = express.Router();
const onboardingController = require("./onboarding.controller");
const authenticateToken = require("../../middleware/authMiddleware");

// All routes here should be protected
router.use(authenticateToken);

router.patch("/step1-partner-type", onboardingController.updatePartnerType);
router.patch("/step2-personal-info", onboardingController.updatePersonalInfo);
router.patch("/step3-service-location", onboardingController.updateServiceLocation);
router.post("/categories", onboardingController.addCategories);
router.post("/services", onboardingController.addServices);
router.post("/packages", onboardingController.addPackages);
router.post("/availability", onboardingController.updateAvailability);
router.post("/bank-details", onboardingController.updateBankDetails);

module.exports = router;
