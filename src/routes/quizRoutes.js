
const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const { submitQuiz } = require("../controllers/quizAnswerController");



router.post("/:quizId/submit", verifyToken, submitQuiz);

module.exports = router;