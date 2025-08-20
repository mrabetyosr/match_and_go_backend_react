const express = require("express");
const router = express.Router();
const { addOfferCompany,getAllOffers,deleteOfferCompany } = require("../controllers/offerController");

// Ajouter une offre (seulement company)
router.post("/add", addOfferCompany);

// Récupérer toutes les offres
router.get("/allOffers", getAllOffers);

//delete offer company only owner can delete his offer
router.delete("/delete/:id", deleteOfferCompany);



module.exports = router;