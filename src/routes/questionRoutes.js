const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const {
  addQuestionToQuiz,
  getQuestionsByQuiz

} = require("../controllers/QuestionController");

// Ajouter une question à un quiz (seul owner de l'offre peut)
router.post("/:quizId/add", verifyToken, addQuestionToQuiz);

// Récupérer toutes les questions d’un quiz
router.get("/:quizId/all", verifyToken, getQuestionsByQuiz);


module.exports = router;