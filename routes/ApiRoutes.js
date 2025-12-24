const express = require("express");
const router = express.Router();

const getServicesRouter = require("../api/get-services");
const getProfileRouter = require("../api/get-profile");
const getStaffsRouter = require("../api/get-staffs");
const getTypesRouter = require("../api/get-service-types");
const getPackagesRouter = require("../api/get-service-packages");

// Mount API subroutes
router.use("/service-categories", getServicesRouter);
router.use("/get-profile", getProfileRouter);
router.use("/get-staffs", getStaffsRouter);
router.use("/get-types", getTypesRouter);
router.use("/get-package", getPackagesRouter);

module.exports = router;
