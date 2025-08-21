const express = require("express");
const router = express.Router();
const { addOfferCompany,getAllOffers,deleteOfferCompany } = require("../controllers/offerController");
const verifyToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");
const { createQuizForOffer } = require("../controllers/quizController");

// Ajouter une offre (seulement company)
router.post("/add", addOfferCompany);

// Récupérer toutes les offres
router.get("/allOffers", getAllOffers);

//delete offer company only owner can delete his offer
router.delete("/delete/:id", deleteOfferCompany);


// ================= QUIZZES ==================

// Créer un quiz pour une offre (seulement owner de l'offre)
router.post(
  "/:offerId/quizzes",
  verifyToken,
  authorizeRoles("company"),
  createQuizForOffer
);


module.exports = router;