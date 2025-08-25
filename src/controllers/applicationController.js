const Application = require("../models/applicationModel");
const Offer = require("../models/offerModel");
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");

const applyToOffer = async (req, res) => {
  try {
   
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.role !== "candidate") {
      return res.status(403).json({ message: "Only candidates can apply." });
    }

    
    const offerId = req.params.offerId;
    const offer = await Offer.findById(offerId);
    if (!offer) return res.status(404).json({ message: "Offer not found" });

    if (offer.applicationDeadline && offer.applicationDeadline < new Date()) {
      return res.status(400).json({ message: "The offer is already closed." });
    }

   
    const existingApp = await Application.findOne({
      candidateId: user._id,
      offerId: offer._id,
    });
    if (existingApp) {
      return res.status(400).json({ message: "You have already applied to this offer." });
    }

   
    if (!req.files || !req.files.cv || !req.files.motivationLetter) {
      return res.status(400).json({ message: "CV and Motivation Letter are required" });
    }

    const cvPath = req.files.cv[0].path;
    const motivationLetterPath = req.files.motivationLetter[0].path;

    
    const application = new Application({
      candidateId: user._id,
      offerId: offer._id,
      cv: cvPath,
      motivationLetter: motivationLetterPath,
      linkedin: req.body.linkedin || null,
      github: req.body.github || null,

      phoneNumber: req.body.phoneNumber || null,
      location: req.body.location || null,
      dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : null,

      
      email: user.email,
    });

    await application.save();

    res.status(201).json({ message: "Application submitted successfully", application });
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    res.status(500).json({ message: err.message });
  }
};


// GET all my applications candidate 
const getMyApplications = async (req, res) => {
  try {
    // 1️⃣ Vérifier le token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

  
    if (!user || user.role !== "candidate") {
      return res.status(403).json({ message: "Only candidates can view their applications." });
    }

    
    const applications = await Application.find({ candidateId: user._id })
      .populate("offerId", "title description companyName location applicationDeadline") // peupler les infos de l’offre
      .sort({ createdAt: -1 }); // tri du plus récent au plus ancien

    res.status(200).json({ applications });

  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    res.status(500).json({ message: err.message });
  }
};

module.exports = { applyToOffer, getMyApplications};
