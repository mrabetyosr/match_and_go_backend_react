// controllers/subscriptionController.js
const User = require("../models/userModel"); // adapte le chemin selon ton projet

const checkSubscriptionStatus = async (req, res) => {
  try {
    const userId = req.params.userId || req.user?.id; // si tu utilises JWT middleware
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    const paidAt = user.paymentInfo?.paidAt;
    if (!paidAt) {
      return res.status(200).json({
        subscriptionStatus: "inactive",
        timeLeftDays: 0,
        expirationDate: null
      });
    }

    // Expiration après 30 jours (tu peux changer)
    const expirationDate = new Date(new Date(paidAt).getTime() + 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = expirationDate - now;

    const status = diffMs > 0 ? "active" : "expired";

    res.status(200).json({
      subscriptionStatus: status,
      timeLeftMs: diffMs > 0 ? diffMs : 0,
      timeLeftDays: diffMs > 0 ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : 0,
      expirationDate
    });

  } catch (error) {
    console.error("Erreur checkSubscriptionStatus:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

module.exports = { checkSubscriptionStatus };
