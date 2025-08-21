const Offer = require("../models/offerModel");
const jwt = require("jsonwebtoken");
const Quiz = require("../models/quizModel");

/// Create a quiz for an offer (only owner)

exports.createQuizForOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    const { title, durationSeconds = 0, totalScore = 100, nbrQuestions = 0 } = req.body; // nbrQuestions destructuré

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
    if (!offer) return res.status(404).json({ message: "Offre not found" });

    if (offer.companyId.toString() !== decoded.id) {
      return res.status(403).json({ message: "Access denied: you are not the owner of the offer!" });
    }

    const quiz = await Quiz.create({ offer: offerId, title, durationSeconds, totalScore, nbrQuestions }); 

    offer.hasQuiz = true;
    offer.quizzes.push(quiz._id);
    await offer.save();

    res.status(201).json(quiz);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


///////////// Get all quizzes for a specific offer

exports.getAllQuizByOffer = async (req, res) => {
  try {
    const { offerId } = req.params;

  
    const offer = await Offer.findById(offerId);
    if (!offer) return res.status(404).json({ message: "Offre introuvable" });

    
    const quizzes = await Quiz.find({ offer: offerId });

    res.status(200).json(quizzes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/////////////update quiz for an offer
exports.updateQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const userId = req.user.id; // récupéré depuis le token
    const { title, durationSeconds, nbrQuestions, totalScore, isActive } = req.body;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz introuvable" });

    const offer = await Offer.findById(quiz.offer);
    if (!offer) return res.status(404).json({ message: "Offre introuvable" });

    
    if (offer.companyId.toString() !== userId) {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à modifier ce quiz" });
    }

    
    if (title) quiz.title = title;
    if (durationSeconds !== undefined) quiz.durationSeconds = durationSeconds;
    if (nbrQuestions !== undefined) quiz.nbrQuestions = nbrQuestions;
    if (totalScore !== undefined) quiz.totalScore = totalScore;
    if (isActive !== undefined) quiz.isActive = isActive;

    await quiz.save();
    res.status(200).json(quiz);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//delete quiz for an offer
exports.deleteQuizByOwner = async (req, res) => {
  try {
    const { quizId } = req.params;

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token manquant" });
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Token invalide" });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    const offer = await Offer.findById(quiz.offer);
    if (!offer) return res.status(404).json({ message: "Offre associée non trouvée" });


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

////////////////////////random quiz for an offer
exports.getRandomQuizByOffer = async (req, res) => {
  try {
    const { offerId } = req.params;

    // Vérifier que l'offre existe
    const offer = await Offer.findById(offerId);
    if (!offer) return res.status(404).json({ message: "Offer not found" });

    // Récupérer un quiz aléatoire lié à cette offre
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