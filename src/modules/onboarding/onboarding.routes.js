const express = require("express");
const router = express.Router();
const onboardingController = require("./onboarding.controller");
const authenticateToken = require("../../../middleware/authToken");

// All routes here should be protected
router.use(authenticateToken);

router.post("/step1-partner-type", onboardingController.updatePartnerType);
router.post("/step2-personal-info", onboardingController.updatePersonalInfo);
router.post("/step3-service-location", onboardingController.updateServiceLocation);
router.post("/step4-categories", onboardingController.addCategories);
router.post("/step5-services", onboardingController.addServices);
router.post("/step6-packages", onboardingController.addPackages);
router.post("/step-specialists", onboardingController.addSpecialists);
router.post("/step-availability", onboardingController.updateAvailability);
router.post("/step-govid", onboardingController.updateGovId);
router.post("/step-bank-details", onboardingController.updateBankDetails);

module.exports = router;
