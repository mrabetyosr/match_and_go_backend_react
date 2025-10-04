const User = require("../models/userModel");
const mongoose = require("mongoose");

const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID format" });
    }

    const user = await User.findById(userId).select(
      "-password -resetPasswordToken -resetPasswordExpire"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Pour les candidats : déterminer le badge le plus important
    if (user.role === "candidate") {
      const badges = user.candidateInfo?.badges || [];
      const badgeOrder = ["Bronze Applicant", "Silver Applicant", "Gold Applicant", "Platinum Applicant", "Diamond Applicant"];
      let topBadge = null;
      for (let i = badgeOrder.length - 1; i >= 0; i--) {
        if (badges.includes(badgeOrder[i])) {
          topBadge = badgeOrder[i];
          break;
        }
      }
      user.candidateInfo = {
        ...user.candidateInfo?.toObject(),
        topBadge,
      };
    }

    // Pas de modification pour les entreprises, juste s'assurer que companyInfo existe
    if (user.role === "company") {
      user.companyInfo = user.companyInfo?.toObject() || {};
    }

    res.json(user);
  } catch (error) {
    console.error("❌ Error getUserById:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

const getAllCandidates = async (req, res) => {
  try {
    // Find all users with role "candidate"
    const candidates = await User.find({ role: "candidate" }).select(
      "-password -resetPasswordToken -resetPasswordExpire"
    );

    // For each candidate, calculate the top badge
    const badgeOrder = ["Bronze Applicant", "Silver Applicant", "Gold Applicant", "Platinum Applicant", "Diamond Applicant"];
    const result = candidates.map(candidate => {
      const badges = candidate.candidateInfo?.badges || [];
      let topBadge = null;
      for (let i = badgeOrder.length - 1; i >= 0; i--) {
        if (badges.includes(badgeOrder[i])) {
          topBadge = badgeOrder[i];
          break;
        }
      }

      return {
        _id: candidate._id,
        username: candidate.username,
        email: candidate.email,
        image_User: candidate.image_User,
        cover_User: candidate.cover_User,
        role: candidate.role,
        candidateInfo: {
          ...candidate.candidateInfo?.toObject(),
          topBadge,
        },
        hasRatedApp: candidate.hasRatedApp,
        loginCount: candidate.loginCount,
      };
    });

    res.json(result);
  } catch (error) {
    console.error("❌ Error getAllCandidates:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};


module.exports = { getUserById,getAllCandidates };
