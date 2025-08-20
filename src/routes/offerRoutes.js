const express = require("express");
const router = express.Router();
const { addOfferCompany,getAllOffers } = require("../controllers/offerController");

// Ajouter une offre (seulement company)
router.post("/add", addOfferCompany);

// Récupérer toutes les offres
router.get("/allOffers", getAllOffers);



module.exports = router;