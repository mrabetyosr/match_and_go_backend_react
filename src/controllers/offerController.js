const Offer = require("../models/offerModel");
const jwt = require("jsonwebtoken");
const { isValidObjectId } = require("mongoose");
const User = require("../models/userModel");

// Add an offer (only for companies)
const addOfferCompany = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Invalid Token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.role !== "company") {
      return res.status(403).json({ message: "Access denied. Only companies can add an offer!." });
    }

    const offerData = { ...req.body, companyId: user._id };
    const newOffer = new Offer(offerData);
    await newOffer.save();

    res.status(201).json(newOffer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
//gel all offers 
const getAllOffers = async (req, res) => {
  try {
const offers = await Offer.find().populate("companyId", "username companyInfo image_User cover_User");
    res.status(200).json(offers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

//delete offer company only owner can delete his offer
const deleteOfferCompany = async (req, res) => {
  try {
    // 1) Token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Invalid token" });

    // 2) Utilisateur
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(403).json({ message: "Access denied" });

    // 3) Valider l'ID d'offre
    const offerId = req.params.id;
    if (!isValidObjectId(offerId)) {
      return res.status(400).json({ message: "Invalid offer id" });
    }

    // 4) Récupérer l'offre
    const offer = await Offer.findById(offerId);
    if (!offer) {
      return res.status(404).json({ message: "Offer not found" });
    }

    // 5) Autorisation : propriétaire OU admin
    const isOwner = offer.companyId.toString() === user._id.toString();
    const isAdmin = user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Access denied. Only the owner or an admin can delete this offer." });
    }

    // 6) Suppression
    await offer.deleteOne(); // équiv. à findByIdAndDelete(offerId)
    return res.status(200).json({ message: "Offer deleted successfully" });

  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    return res.status(500).json({ message: err.message });
  }
};


//////////////////////////get offer by id /////////////////////////
const getOfferById = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id)
      .populate("companyId", "username companyInfo image_User cover_User"); // popule les infos de la company
    if (!offer) return res.status(404).json({ message: "Offer not found" });

    res.status(200).json(offer); // renvoie toutes les infos de l'offre
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// Récupérer toutes les offres d'une company connectée


 const getMyOffers = async (req, res) => {
  try {
    if (req.user.role !== "company") {
      return res.status(403).json({ message: "Accès réservé aux entreprises" });
    }

    const offers = await Offer.find({ companyId: req.user.id })
      .populate("quizzes") // pour voir aussi les quiz rattachés
      .sort({ createdAt: -1 });

    res.status(200).json({ offers });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


/////////////////////////////////::::Update offer (only by owner or admin)/////////////////////////////////////
const updateOfferByOwner = async (req, res) => {
  try {
    // 1) Vérifier le token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Invalid token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(403).json({ message: "Access denied" });

    // 2) Valider l'ID de l'offre
    const offerId = req.params.id;
    if (!isValidObjectId(offerId)) {
      return res.status(400).json({ message: "Invalid offer id" });
    }

    // 3) Récupérer l'offre
    const offer = await Offer.findById(offerId);
    if (!offer) return res.status(404).json({ message: "Offer not found" });

    // 4) Vérifier que l'utilisateur est le propriétaire ou admin
    const isOwner = offer.companyId.toString() === user._id.toString();
    const isAdmin = user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Access denied. Only the owner or an admin can update this offer." });
    }

    // 5) Mettre à jour l'offre
    Object.assign(offer, req.body); // met à jour seulement les champs envoyés
    await offer.save();

    res.status(200).json({ message: "Offer updated successfully", offer });

  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    res.status(500).json({ message: err.message });
  }
};


const searchOffers = async (req, res) => {
  try {
    const query = req.query.q;

    if (!query || query.trim() === "") {
      return res.status(400).json({ message: "Search query is required" });
    }

    const offers = await Offer.find({
      $or: [
        { jobTitle: { $regex: query, $options: "i" } },
        { skills: { $regex: query, $options: "i" } },
        { tags: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } }
      ]
    })
    .populate("companyId") // récupère toutes les infos de l'utilisateur/entreprise
    .limit(10);

    res.json(offers);
  } catch (error) {
    console.error("Error searching offers:", error);
    res.status(500).json({ message: "Server error" });
  }
};


module.exports = { searchOffers,addOfferCompany,getAllOffers,deleteOfferCompany,getOfferById,getMyOffers,updateOfferByOwner };