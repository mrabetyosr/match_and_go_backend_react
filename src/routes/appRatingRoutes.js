const express = require("express");
const router = express.Router();
const { addAppRating } = require("../controllers/appRatingController");

router.post("/rate", addAppRating);

module.exports = router;