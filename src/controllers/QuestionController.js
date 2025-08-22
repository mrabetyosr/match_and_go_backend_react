const Quiz = require("../models/quizModel");
const Question = require("../models/questionModel");
const Offer = require("../models/offerModel");

/////////////////////// Ajouter une question à un quiz ///////////////////////
exports.addQuestionToQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { text, correctAnswer, wrongAnswers, score = 1 } = req.body;
    const userId = req.user.id; // récupéré depuis verifyToken

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz introuvable" });

    const offer = await Offer.findById(quiz.offer);
    if (!offer) return res.status(404).json({ message: "Offre introuvable" });

    // Vérifier que seul le propriétaire de l'offre peut ajouter
    if (offer.companyId.toString() !== userId)
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à ajouter une question" });

    // Vérifier le nombre de questions existantes
    const questionCount = await Question.countDocuments({ quiz: quizId });
    if (questionCount >= quiz.nbrQuestions)
      return res.status(400).json({ message: `Impossible d'ajouter plus de ${quiz.nbrQuestions} questions à ce quiz` });

    const order = questionCount + 1; // ordre automatique
    const question = await Question.create({ quiz: quizId, text, correctAnswer, wrongAnswers, score, order });

    res.status(201).json(question);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

