const express = require("express");
const router = express.Router();
const { applyToOffer, getMyApplications } = require("../controllers/applicationController");
const upload = require("../middleware/uploadFile");


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

module.exports = router;
