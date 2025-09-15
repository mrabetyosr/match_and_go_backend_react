const User = require("../models/userModel");
const mongoose = require("mongoose");

// 🔹 Récupérer le profil d’un utilisateur ou d’une entreprise par ID
const getCompanyById = async (req, res) => {
  try {
    const userId = req.params.id;

    // Vérifie si l'ID est un ObjectId MongoDB valide
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    // Recherche l'utilisateur par ID, exclut le mot de passe
    const user = await User.findById(userId).select("-password -resetPasswordToken -resetPasswordExpire");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Construire un objet clean pour le frontend
    const profile = {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      image_User: user.image_User,
      cover_User: user.cover_User,
      candidateInfo: user.candidateInfo || null,
      companyInfo: user.companyInfo || null,
      hasRatedApp: user.hasRatedApp,
      loginCount: user.loginCount,
    };

    res.json(profile);
  } catch (error) {
    console.error("❌ Error getCompanyById:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getCompanyById };
