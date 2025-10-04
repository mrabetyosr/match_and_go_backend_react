const User = require('../models/userModel'); // ajuste le chemin si nécessaire

// Récupérer les infos d'un candidat
const getCandidateProfile = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).lean(); // lean() pour objet simple

    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role !== 'candidate') {
      return res.status(403).json({ message: "Access denied: not a candidate" });
    }

    // Préparer les données à renvoyer
    const candidateProfile = {
      id: user._id,
      username: user.username,
      email: user.email,
      image_User: user.image_User,
      cover_User: user.cover_User,
      candidateInfo: {
        phoneNumber: user.candidateInfo.phoneNumber,
        location: user.candidateInfo.location,
        dateOfBirth: user.candidateInfo.dateOfBirth,
        savedJobs: user.candidateInfo.savedJobs || [],
        badges: user.candidateInfo.badges || [],
      },
    };

    res.status(200).json({ success: true, candidateProfile });
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getCandidateProfile };
