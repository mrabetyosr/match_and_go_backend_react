
const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const { submitQuiz,getQuizSubmissions } = require("../controllers/quizAnswerController");
const { getRandomQuizWithQuestions } = require("../controllers/quizController");


//submit quiz answers (only candidate)
router.post("/:quizId/submit", verifyToken, submitQuiz);

//all submissions for a quiz (only admin and company)
router.get("/:quizId/allSubmissions", verifyToken, getQuizSubmissions);

//  récupérer un quiz aléatoire avec questions (pour candidat)
router.get("/:offerId/random-quiz-with-questions", verifyToken, getRandomQuizWithQuestions);


module.exports = router;