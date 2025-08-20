const multer = require("multer");
const path = require('path')
const fs = require('fs')
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/images')
  },
  filename: function (req, file, cb) {
    const uploadPath = 'public/images';
    const originalName = file.originalname;
    console.log(file.originalname)
    const fileExtension = path.extname(originalName);
    let fileName = originalName;

    // Vérifier si le fichier existe déjà
    let fileIndex = 1;
    while (fs.existsSync(path.join(uploadPath, fileName))) {
      const baseName = path.basename(originalName, fileExtension);
      fileName = `${baseName}_${fileIndex}${fileExtension}`;
      fileIndex++;
    }

    cb(null, fileName);
  }
})

var uploadfile = multer({ storage: storage });
module.exports = uploadfile;