const express = require("express");
const router = express.Router();
const { applyToOffer } = require("../controllers/applicationController");
const upload = require("../middleware/uploadFile");


router.post(
  "/:offerId",
  upload.fields([
    { name: "cv", maxCount: 1 },
    { name: "motivationLetter", maxCount: 1 }
  ]),
  applyToOffer
);

module.exports = router;
