const express = require("express");
const router = express.Router();
const { applyToOffer, getMyApplications, getOfferSubmissions } = require("../controllers/applicationController");
const upload = require("../middleware/uploadFile");
const verifyToken = require("../middleware/authMiddleware");


router.post(
  "/:offerId",
  upload.fields([
    { name: "cv", maxCount: 1 },
    { name: "motivationLetter", maxCount: 1 }
  ]),
  applyToOffer
);

//get all of my applications 
router.get(
  "/my-applications",
  getMyApplications
);

// GET all submissions for an offer (only owner)
router.get("/:offerId/submissions", verifyToken, getOfferSubmissions);

module.exports = router;
