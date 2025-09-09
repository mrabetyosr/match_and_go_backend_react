const express = require("express");
const router = express.Router();
const meetController = require("../controllers/meetController");

router.post("/schedule-meet", meetController.scheduleMeet);

module.exports = router;
