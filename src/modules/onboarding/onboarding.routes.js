const express = require("express");
const router = express.Router();
const onboardingController = require("./onboarding.controller");
const authenticateToken = require("../../middleware/authMiddleware");

// All routes here should be protected
router.use(authenticateToken);

router.patch("/step1-partner-type", onboardingController.updatePartnerType);
router.patch("/step2-personal-info", onboardingController.updatePersonalInfo);
// Alias for service mode
router.patch("/step3-service-mode", onboardingController.updateServiceLocation);
router.patch("/step3-service-location", onboardingController.updateServiceLocation);
router.post("/studio-specialists", onboardingController.addStudioSpecialists);
router.post("/step4-categories", onboardingController.addCategories);
router.post("/step5-services", onboardingController.addServices);
router.post("/step6-packages", onboardingController.addPackages);
router.post("/step-availability", onboardingController.updateAvailability);
router.post("/step-bank-details", onboardingController.updateBankDetails);
router.patch("/kyc", onboardingController.updateGovId);
router.patch("/step-govid", onboardingController.updateGovId); // keep existing for safety
router.patch("/complete", onboardingController.completeOnboarding);

module.exports = router;
