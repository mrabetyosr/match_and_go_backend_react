const Offer = require("../models/offerModel");
const jwt = require("jsonwebtoken");
const Quiz = require("../models/quizModel");
const User = require("../models/userModel");
const sendEmail = require("../utils/sendEmail");
const Question = require("../models/questionModel");


// 🔹 Fonction utilitaire : recalcul automatique du totalScore et nbrQuestions
const recalcQuizStats = async (quizId) => {
  const questions = await Question.find({ quiz: quizId });
  const totalScore = questions.reduce((sum, q) => sum + q.score, 0);
  const nbrQuestions = questions.length;

  await Quiz.findByIdAndUpdate(quizId, { totalScore, nbrQuestions });
};


/// 🔹 Créer un quiz pour une offre (seulement par le propriétaire)
exports.createQuizForOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    const { title, durationSeconds = 0 } = req.body; // ❌ plus de totalScore & nbrQuestions manuels

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token not found" });
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Invalid Token" });
    }

    const offer = await Offer.findById(offerId);
    if (!offer) return res.status(404).json({ message: "Offer not found" });

    if (offer.companyId.toString() !== decoded.id) {
      return res.status(403).json({ message: "Access denied: you are not the owner of the offer!" });
    }

    const quiz = await Quiz.create({ offer: offerId, title, durationSeconds });

    await recalcQuizStats(quiz._id);

    offer.hasQuiz = true;
    offer.quizzes.push(quiz._id);
    await offer.save();

    res.status(201).json(quiz);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


/// 🔹 Récupérer tous les quiz d’une offre
exports.getAllQuizByOffer = async (req, res) => {
  try {
    const { offerId } = req.params;

    const offer = await Offer.findById(offerId);
    if (!offer) return res.status(404).json({ message: "Offer not found" });

    const quizzes = await Quiz.find({ offer: offerId });

    res.status(200).json(quizzes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


/// 🔹 Mettre à jour un quiz
exports.updateQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const userId = req.user.id;
    const { title, durationSeconds, isActive } = req.body; // ❌ plus besoin de totalScore & nbrQuestions

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    const offer = await Offer.findById(quiz.offer);
    if (!offer) return res.status(404).json({ message: "Offer not found" });

    if (offer.companyId.toString() !== userId) {
      return res.status(403).json({ message: "You are not allowed to update this quiz" });
    }

    if (title) quiz.title = title;
    if (durationSeconds !== undefined) quiz.durationSeconds = durationSeconds;
    if (isActive !== undefined) quiz.isActive = isActive;

    await quiz.save();
    await recalcQuizStats(quiz._id);

    res.status(200).json(quiz);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


/// 🔹 Supprimer un quiz
exports.deleteQuizByOwner = async (req, res) => {
  try {
    const { quizId } = req.params;

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token missing" });
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    const offer = await Offer.findById(quiz.offer);
    if (!offer) return res.status(404).json({ message: "Associated offer not found" });

    if (offer.companyId.toString() !== decoded.id) {
      return res.status(403).json({ message: "Access denied: you are not the owner of this quiz!" });
    }

    await Quiz.findByIdAndDelete(quizId);

    offer.quizzes = offer.quizzes.filter(qId => qId.toString() !== quizId);
    if (offer.quizzes.length === 0) offer.hasQuiz = false;
    await offer.save();

    res.status(200).json({ message: "Quiz deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


/// 🔹 Récupérer un quiz aléatoire
exports.getRandomQuizByOffer = async (req, res) => {
  try {
    const { offerId } = req.params;

    const offer = await Offer.findById(offerId);
    if (!offer) return res.status(404).json({ message: "Offer not found" });

    const [randomQuiz] = await Quiz.aggregate([
      { $match: { offer: offer._id } },
      { $sample: { size: 1 } }
    ]);

    if (!randomQuiz) return res.status(404).json({ message: "No quiz found for this offer" });

    res.status(200).json(randomQuiz);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


/// 🔹 Nombre de quiz pour une offre
exports.getQuizCountByOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    const userId = req.user.id;

    const offer = await Offer.findById(offerId);
    if (!offer) return res.status(404).json({ message: "Offer not found" });

    if (offer.companyId.toString() !== userId) {
      return res.status(403).json({ message: "Access denied: you are not the owner of this offer" });
    }

    const quizCount = offer.quizzes.length;

    res.status(200).json({ offerId, quizCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


/// 🔹 Publier un quiz
exports.publishQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const userId = req.user.id;

    const quiz = await Quiz.findById(quizId).populate("offer");
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });
    if (quiz.offer.companyId.toString() !== userId)
      return res.status(403).json({ message: "You are not allowed to publish this quiz" });
    if (quiz.isPublished)
      return res.status(400).json({ message: "This quiz is already published" });

    quiz.isPublished = true;
    await quiz.save();

    const owner = await User.findById(userId);
    if (owner && owner.email) {
      await sendEmail(owner.email, quiz); // <-- ici on passe l'objet quiz directement
    }

    res.status(200).json({ message: "Quiz published successfully", quiz });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
/// 🔹 Vérifier la disponibilité des quiz pour une offre
exports.checkQuizAvailability = async (req, res) => {
  try {
    const { offerId } = req.params;

    // Vérifier si l'offre existe
    const offer = await Offer.findById(offerId);
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    // Compter les quiz publiés pour CETTE offre
    const quizCount = await Quiz.countDocuments({ 
      offer: offerId,       // <-- ici on utilise "offer"
      isPublished: true 
    });

    return res.status(200).json({
      hasQuiz: quizCount > 0,
      count: quizCount,
      offerId: offerId
    });

  } catch (error) {
    console.error("Error checking quiz availability:", error);
    return res.status(500).json({ 
      message: "Server error", 
      error: error.message 
    });
  }
};
