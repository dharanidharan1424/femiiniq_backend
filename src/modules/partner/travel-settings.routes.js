const express = require('express');
const router = express.Router();
const authenticateToken = require('../../../middleware/authToken');
const { updateTravelSettings } = require('./travel-settings.controller');

router.post('/', authenticateToken, updateTravelSettings);

module.exports = router;
