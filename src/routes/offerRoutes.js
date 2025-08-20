const express = require("express");
const router = express.Router();
const { addOfferCompany } = require("../controllers/offerController");

// Ajouter une offre (seulement company)
router.post("/add", addOfferCompany);



module.exports = router;