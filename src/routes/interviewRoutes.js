const express = require("express");
const router = express.Router();
const { scheduleInterview, getInterviewsByOffer,getMyInterviews,getInterviewsByDate} = require("../controllers/interviewController");

// Planifier un entretien pour une candidature
router.post("/:applicationId", scheduleInterview);


// Récupérer toutes les interviews pour une offre (Company)
//http://localhost:7001/api/interviews/offer/offerId
router.get("/offer/:offerId", getInterviewsByOffer);

// Récupérer toutes les interviews du candidat connecté
router.get("/my", getMyInterviews);

// Filtrer par date
router.get("/filter", getInterviewsByDate);

module.exports = router;