const express = require("express");
const router = express.Router();
const { addOfferCompany,getAllOffers,deleteOfferCompany,getOfferById,getMyOffers } = require("../controllers/offerController");
const verifyToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");
const { createQuizForOffer,getAllQuizByOffer,updateQuiz,deleteQuizByOwner,getRandomQuizByOffer,getQuizCountByOffer,publishQuiz} = require("../controllers/quizController");

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

// Get all quizzes for an offer
router.get("/:offerId/allquizzes", verifyToken, getAllQuizByOffer);

// Update quiz (only owner)
router.put("/updatequiz/:quizId", verifyToken, updateQuiz);
// Delete quiz by owner
router.delete("/deletequiz/:quizId", verifyToken, deleteQuizByOwner);
// Récupérer un quiz aléatoire pour une offre
router.get("/:offerId/random-quiz", verifyToken, getRandomQuizByOffer);
/////nombre de quiz dune offre 
router.get("/:offerId/quiz-count", verifyToken, getQuizCountByOffer);
// Publier un quiz (seul owner de l'offre)
router.put("/:quizId/publish", verifyToken, publishQuiz);



router.get("/myOffers", verifyToken, authorizeRoles("company"), getMyOffers);

// Récupérer une offre par son ID
router.get("/:id", getOfferById);
module.exports = router;