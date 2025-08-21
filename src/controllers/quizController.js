const Offer = require("../models/offerModel");
const jwt = require("jsonwebtoken");
const Quiz = require("../models/quizModel");

exports.createQuizForOffer = async (req, res) => {
  try {
    const { offerId } = req.params;
    const { title, durationSeconds = 0, totalScore = 100 } = req.body;

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token manquant" });
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

    const quiz = await Quiz.create({ offer: offerId, title, durationSeconds, totalScore });

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
