const express = require("express");
const router = express.Router();
const { getUserById ,getAllCandidates} = require("../controllers/profileController");

// ✅ GET /api/profile/:id
router.get("/candidates", getAllCandidates);
router.get("/:id", getUserById);


module.exports = router;
