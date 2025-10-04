const express = require('express');
const router = express.Router();
const { getCandidateProfile } = require('../controllers/profilecandidateController');

// Route pour récupérer le profil du candidat connecté
// Méthode GET : /api/candidate/profile
router.get('/profile', getCandidateProfile);

module.exports = router;
