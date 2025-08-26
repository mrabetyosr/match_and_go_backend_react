const express = require("express");
const router = express.Router();
const { scheduleInterview, getInterviewsByOffer} = require("../controllers/interviewController");

// Planifier un entretien pour une candidature
router.post("/:applicationId", scheduleInterview);


// Récupérer toutes les interviews pour une offre (Company)
//http://localhost:7001/api/interviews/offer/offerId
router.get("/offer/:offerId", getInterviewsByOffer);

module.exports = router;