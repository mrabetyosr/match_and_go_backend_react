const Quiz = require("../models/quizModel");
const Question = require("../models/questionModel");
const Offer = require("../models/offerModel");

/////////////////////// Add a question to a quiz ///////////////////////
exports.addQuestionToQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { text, correctAnswer, wrongAnswers, score = 1 } = req.body;
    const userId = req.user.id;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    const offer = await Offer.findById(quiz.offer);
    if (!offer) return res.status(404).json({ message: "Offer not found" });

    if (offer.companyId.toString() !== userId)
      return res.status(403).json({ message: "You are not authorized to add a question" });

    // Calculate the order of the new question
    const questionCount = await Question.countDocuments({ quiz: quizId });
    const order = questionCount + 1;

    // Create the question
    const question = await Question.create({ quiz: quizId, text, correctAnswer, wrongAnswers, score, order });

    // Automatically recalc total score and number of questions
    await recalcQuizStats(quizId);

    res.status(201).json(question);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/////////////////////// Get all questions of a quiz ///////////////////////
exports.getQuestionsByQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const questions = await Question.find({ quiz: quizId }).sort({ order: 1 });
    res.status(200).json(questions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/////////////////////// Update a question ///////////////////////
exports.updateQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { text, correctAnswer, wrongAnswers, score, order } = req.body;
    const userId = req.user.id;

    const question = await Question.findById(questionId);
    if (!question) return res.status(404).json({ message: "Question not found" });

    const quiz = await Quiz.findById(question.quiz);
    const offer = await Offer.findById(quiz.offer);

    if (offer.companyId.toString() !== userId)
      return res.status(403).json({ message: "Only the owner of the offer can update this question" });

    if (text) question.text = text;
    if (correctAnswer) question.correctAnswer = correctAnswer;
    if (wrongAnswers) question.wrongAnswers = wrongAnswers;
    if (score !== undefined) question.score = score;
    if (order !== undefined) question.order = order;

    await question.save();
    res.status(200).json(question);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/////////////////////// Delete a question ///////////////////////
exports.deleteQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const userId = req.user.id;

    const question = await Question.findById(questionId);
    if (!question) return res.status(404).json({ message: "Question not found" });

    const quiz = await Quiz.findById(question.quiz);
    const offer = await Offer.findById(quiz.offer);

    if (offer.companyId.toString() !== userId)
      return res.status(403).json({ message: "Only the owner of the offer can delete this question" });

    await Question.findByIdAndDelete(questionId);
    res.status(200).json({ message: "Question deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Recalculate quiz score
const recalcQuizStats = async (quizId) => {
  const questions = await Question.find({ quiz: quizId });
  const totalScore = questions.reduce((sum, q) => sum + q.score, 0);
  const nbrQuestions = questions.length;

  await Quiz.findByIdAndUpdate(quizId, { totalScore, nbrQuestions });
};
