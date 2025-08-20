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