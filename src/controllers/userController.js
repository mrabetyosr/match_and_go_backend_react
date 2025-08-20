const fsp = require("fs/promises");
const path = require("path");
const User = require("../models/userModel");
const verifyToken = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadFile");
const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");



async function cleanupUploadedFile(file) {
  try {
    if (!file) return;
    const fullPath = file.path || path.join(file.destination, file.filename);
    await fsp.unlink(fullPath);
    console.log("[CLEANUP] Fichier supprimé :", fullPath);
  } catch (e) {
    if (e.code !== "ENOENT") {
      console.error("[CLEANUP] Erreur suppression fichier :", e.message);
    }
  }
}
// Update user photo
// only connected user can update his photo

module.exports.updatePhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Aucun fichier fourni" });
    }

    // req.user vient de  verifyToken (contient id et role)
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { image_User: req.file.filename },
      { new: true }
    );

    if (!updatedUser) {
      await cleanupUploadedFile(req.file);
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    res.status(200).json(updatedUser);
  } catch (err) {
    await cleanupUploadedFile(req.file);
    res.status(500).json({ message: err.message });
  }
};

//update cover photo
module.exports.updateCover = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Aucun fichier fourni" });
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            { cover_User: req.file.filename },
            { new: true }
        );

        if (!updatedUser) {
            await cleanupUploadedFile(req.file);
            return res.status(404).json({ message: "Utilisateur non trouvé" });
        }

        res.status(200).json(updatedUser);
    } catch (err) {
        await cleanupUploadedFile(req.file);
        res.status(500).json({ message: err.message });
    }
};


// delete user by id
// only admin can delete user
module.exports.DeleteUserById = async (req, res) => {
  try {
    const id = req.params.id;

    const token = req.headers.authorization?.split(" ")[1]; // Bearer token
    if (!token) return res.status(401).json({ message: "Access denied. No token provided." });


    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Assure-toi que JWT_SECRET est défini
    const connectedUser = await userModel.findById(decoded.id);

    if (!connectedUser || connectedUser.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Only admins can delete users." });
    }

   
    const userToDelete = await userModel.findById(id);
    if (!userToDelete) {
      return res.status(404).json({ message: "User not found." });
    }

   
    if (!["candidate", "company"].includes(userToDelete.role)) {
      return res.status(403).json({ message: "You can only delete users with role candidate or company." });
    }

    
    await userModel.findByIdAndDelete(id);

    res.status(200).json({ message: "User deleted successfully." });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Update user information
// only connected user can update his information

module.exports.updateUserInfo = async (req, res) => {
  try {
    const userId = req.user.id; 
    const { username, image_User, companyInfo } = req.body || {};

    const updateData = {};

   
    if (username) {
      const existingUser = await User.findOne({ username, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({ message: "Username déjà utilisé" });
      }
      updateData.username = username;
    }

   
    if (image_User) {
      updateData.image_User = image_User;
    }


    if (companyInfo) {
      
      const company = typeof companyInfo === "string" ? JSON.parse(companyInfo) : companyInfo;

      updateData.companyInfo = {};
      const allowedFields = ["description", "location", "category", "founded", "size", "website", "socialLinks"];
      allowedFields.forEach(field => {
        if (company[field] !== undefined) {
          updateData.companyInfo[field] = company[field];
        }
      });
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });

    if (!updatedUser) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    res.status(200).json(updatedUser);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all candidates
module.exports.getAllCandidates = async (req, res) => {
  try {
    const candidates = await User.find({ role: "candidate" });

    if (!candidates || candidates.length === 0) {
      return res.status(404).json({ message: "No candidates found" });
    }

    res.status(200).json({ candidates });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Get all companies
module.exports.getAllCompany = async (req, res) => {
  try {
    // Find users where role is "company"
    const companies = await User.find({ role: "company" });

    res.status(200).json({ companies });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};