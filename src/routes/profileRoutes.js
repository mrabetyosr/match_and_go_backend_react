const express = require("express");
const router = express.Router();
const { getCompanyById } = require("../controllers/profileController");

// ✅ GET /api/profile/:id
router.get("/:id", getCompanyById);

module.exports = router;
