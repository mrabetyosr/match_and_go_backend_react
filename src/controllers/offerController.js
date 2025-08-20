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
    const offers = await Offer.find().populate("companyId", "username companyInfo");
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

module.exports = { addOfferCompany,getAllOffers,deleteOfferCompany };