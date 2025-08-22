const Quiz = require("../models/quizModel");
const Question = require("../models/questionModel");
const Offer = require("../models/offerModel");

/////////////////////// Ajouter une question à un quiz ///////////////////////
exports.addQuestionToQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { text, correctAnswer, wrongAnswers, score = 1 } = req.body;
    const userId = req.user.id;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz introuvable" });

    const offer = await Offer.findById(quiz.offer);
    if (!offer) return res.status(404).json({ message: "Offre introuvable" });

    if (offer.companyId.toString() !== userId)
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à ajouter une question" });

    // Calculer l'ordre de la nouvelle question
    const questionCount = await Question.countDocuments({ quiz: quizId });
    const order = questionCount + 1;

    // Créer la question
    const question = await Question.create({ quiz: quizId, text, correctAnswer, wrongAnswers, score, order });

    // Recalculer automatiquement le score total et le nombre de questions
    await recalcQuizStats(quizId);

    res.status(201).json(question);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


/////////////////////// Récupérer toutes les questions d’un quiz ///////////////////////
exports.getQuestionsByQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const questions = await Question.find({ quiz: quizId }).sort({ order: 1 });
    res.status(200).json(questions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/////////////////////// Mettre à jour une question ///////////////////////
exports.updateQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { text, correctAnswer, wrongAnswers, score, order } = req.body;
    const userId = req.user.id;

    const question = await Question.findById(questionId);
    if (!question) return res.status(404).json({ message: "Question introuvable" });

    const quiz = await Quiz.findById(question.quiz);
    const offer = await Offer.findById(quiz.offer);

    if (offer.companyId.toString() !== userId)
      return res.status(403).json({ message: "Seul le propriétaire de l'offre peut modifier cette question" });

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

/////////////////////// Supprimer une question ///////////////////////
exports.deleteQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const userId = req.user.id;

    const question = await Question.findById(questionId);
    if (!question) return res.status(404).json({ message: "Question introuvable" });

    const quiz = await Quiz.findById(question.quiz);
    const offer = await Offer.findById(quiz.offer);

    if (offer.companyId.toString() !== userId)
      return res.status(403).json({ message: "Seul le propriétaire de l'offre peut supprimer cette question" });

    await Question.findByIdAndDelete(questionId);
    res.status(200).json({ message: "Question supprimée avec succès" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


//recalcul score de quiz 
const recalcQuizStats = async (quizId) => {
  const questions = await Question.find({ quiz: quizId });
  const totalScore = questions.reduce((sum, q) => sum + q.score, 0);
  const nbrQuestions = questions.length;

  await Quiz.findByIdAndUpdate(quizId, { totalScore, nbrQuestions });
};
