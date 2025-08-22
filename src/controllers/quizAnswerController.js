const Quiz = require("../models/quizModel");
const Question = require("../models/questionModel");
const QuizAnswer = require("../models/quizAnswer");

exports.submitQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { answers } = req.body;
    const candidateId = req.user.id;

    // Only candidates can submit a quiz
    if (req.user.role !== "candidate") {
      return res.status(403).json({ message: "Only a candidate can submit a quiz" });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz || !quiz.isPublished) {
      return res.status(404).json({ message: "Quiz not found or not published" });
    }

    // Check if candidate has already submitted a quiz for the same offer
    const previousSubmission = await QuizAnswer.findOne({
      candidate: candidateId
    }).populate({
      path: "quiz",
      match: { offer: quiz.offer } // only quizzes of the same offer
    }).sort({ createdAt: -1 });

    if (previousSubmission && previousSubmission.quiz) {
      const lastSubmissionTime = new Date(previousSubmission.createdAt);
      const now = new Date();
      const diffHours = (now - lastSubmissionTime) / (1000 * 60 * 60);

      if (diffHours < 48) {
        return res.status(400).json({
          message: "You can only submit another quiz for this offer after 48 hours"
        });
      }
    }

    // Process answers and calculate total score
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
