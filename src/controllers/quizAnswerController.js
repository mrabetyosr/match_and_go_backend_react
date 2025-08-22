// controllers/quizAnswerController.js
const Quiz = require("../models/quizModel");
const Question = require("../models/questionModel");
const QuizAnswer = require("../models/quizAnswer");

exports.submitQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { answers } = req.body;
    const candidateId = req.user.id;

    // Ensure the user is a candidate
    if (req.user.role !== "candidate") {
      return res.status(403).json({ message: "Only candidates can submit a quiz" });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz || !quiz.isPublished) {
      return res.status(404).json({ message: "Quiz not found or not published" });
    }

    // Check if the candidate has already submitted
    const existing = await QuizAnswer.findOne({ quiz: quizId, candidate: candidateId });
    if (existing) {
      return res.status(400).json({ message: "You have already submitted this quiz" });
    }

    let totalScore = 0;
    const processedAnswers = [];

    for (const ans of answers) {
      const question = await Question.findById(ans.questionId);
      if (!question) continue;

      const isCorrect = question.correctAnswer === ans.selectedAnswer;
      const score = isCorrect ? question.score : 0;
      totalScore += score;

      processedAnswers.push({
        question: question._id,
        selectedAnswer: ans.selectedAnswer,
        isCorrect,
        score,
      });
    }

    const quizAnswer = await QuizAnswer.create({
      quiz: quizId,
      candidate: candidateId,
      answers: processedAnswers,
      totalScore,
    });

    res.status(201).json({ message: "Quiz submitted successfully", quizAnswer });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
