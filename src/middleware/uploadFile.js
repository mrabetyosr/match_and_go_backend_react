const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadPath = "public/images";

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const originalName = file.originalname;
    const fileExtension = path.extname(originalName);

    // Nettoyage : remplace espaces/accents/apostrophes par "_"
    const baseName = path
      .basename(originalName, fileExtension)
      .normalize("NFD") // enlève les accents
      .replace(/[\u0300-\u036f]/g, "") // supprime diacritiques
      .replace(/[^a-zA-Z0-9]/g, "_"); // caractères spéciaux -> "_"

    let fileName = `${Date.now()}_${baseName}${fileExtension}`;
    let fileIndex = 1;

    // Si déjà existant → ajoute suffixe
    while (fs.existsSync(path.join(uploadPath, fileName))) {
      fileName = `${Date.now()}_${baseName}_${fileIndex}${fileExtension}`;
      fileIndex++;
    }

    cb(null, fileName);
  },
});

// Filtrage des fichiers autorisés
const fileFilter = (req, file, cb) => {
  const allowedTypes = [".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, DOC, DOCX, PNG, JPG, JPEG are allowed"), false);
  }
};

const uploadApplicationFiles = multer({ storage, fileFilter });

module.exports = uploadApplicationFiles;
