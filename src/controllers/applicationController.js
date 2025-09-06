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

    const cvPath = req.files.cv[0].filename;
    const motivationLetterPath = req.files.motivationLetter[0].filename;

    
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

    // 2️⃣ Vérifier que l'utilisateur est un candidat
    if (!user || user.role !== "candidate") {
      return res.status(403).json({ message: "Only candidates can view their applications." });
    }

    // 3️⃣ Récupérer toutes les applications du candidat
    const applications = await Application.find({ candidateId: user._id })
      .populate({
        path: "offerId",
        select: "jobTitle description applicationDeadline companyId",
        populate: {
          path: "companyId",
          select: "username image_User companyInfo.location companyInfo.description" // infos complètes de l'entreprise
        }
      })
      .sort({ createdAt: -1 }); // tri du plus récent au plus ancien

    // 4️⃣ Retourner la réponse
    res.status(200).json({ applications });

  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    res.status(500).json({ message: err.message });
  }
};


// GET all submissions for an offer (only owner of the offer)
const getOfferSubmissions = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) return res.status(403).json({ message: "User not found" });

    const offerId = req.params.offerId;

    
    const offer = await Offer.findById(offerId);
    if (!offer) return res.status(404).json({ message: "Offer not found" });

    if (offer.companyId.toString() !== user._id.toString()) {
      return res.status(403).json({ message: "Access denied. Only the offer owner can see submissions." });
    }

    // 3️⃣ Récupérer toutes les candidatures pour cette offre
    const applications = await Application.find({ offerId: offer._id })
      .populate("candidateId", "username email dateOfBirth phoneNumber location")
      .sort({ createdAt: -1 });

    res.status(200).json({ applications });

  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    res.status(500).json({ message: err.message });
  }
};

// UPDATE application status (only by company who owns the offer)
const updateApplicationStatus = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.role !== "company") {
      return res.status(403).json({ message: "Only companies can update application status." });
    }

    const applicationId = req.params.applicationId;
    const { status } = req.body;

    // Find the application and populate the offer to check ownership
    const application = await Application.findById(applicationId).populate('offerId');
    
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    // Check if the company owns the offer
    if (application.offerId.companyId.toString() !== user._id.toString()) {
      return res.status(403).json({ message: "Access denied. You can only update applications for your own offers." });
    }

    // Update the application status
    application.status = status;
    await application.save();

    res.status(200).json({ message: "Status updated successfully", application });
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    res.status(500).json({ message: err.message });
  }
};

module.exports = { applyToOffer, getMyApplications, getOfferSubmissions, updateApplicationStatus };
