const express = require("express");
const router = express.Router();
const { scheduleInterview } = require("../controllers/interviewController");

// Planifier un entretien pour une candidature
router.post("/:applicationId", scheduleInterview);



module.exports = router;