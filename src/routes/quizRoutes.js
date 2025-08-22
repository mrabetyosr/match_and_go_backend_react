
const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const { submitQuiz,getQuizSubmissions } = require("../controllers/quizAnswerController");


//submit quiz answers (only candidate)
router.post("/:quizId/submit", verifyToken, submitQuiz);

//all submissions for a quiz (only admin and company)
router.get("/:quizId/allSubmissions", verifyToken, getQuizSubmissions);

module.exports = router;