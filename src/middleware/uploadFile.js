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
    let fileName = originalName;

    let fileIndex = 1;
    while (fs.existsSync(path.join(uploadPath, fileName))) {
      const baseName = path.basename(originalName, fileExtension);
      fileName = `${baseName}_${fileIndex}${fileExtension}`;
      fileIndex++;
    }

    cb(null, fileName);
  },
});

// Filtrage des fichiers autorisés
const fileFilter = (req, file, cb) => {
  // Ajout de .png et .jpg
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
