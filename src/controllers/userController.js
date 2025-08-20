const fsp = require("fs/promises");
const path = require("path");
const User = require("../models/userModel");
const verifyToken = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadFile");

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

    // ⚡ req.user vient de ton verifyToken (contient id et role)
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