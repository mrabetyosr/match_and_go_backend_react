const Offer = require("../models/offerModel");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

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

module.exports = { addOfferCompany };