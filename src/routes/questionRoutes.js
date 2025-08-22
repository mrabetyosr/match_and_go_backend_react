const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const {
  addQuestionToQuiz

} = require("../controllers/QuestionController");

// Ajouter une question à un quiz (seul owner de l'offre peut)
router.post("/:quizId/add", verifyToken, addQuestionToQuiz);


module.exports = router;