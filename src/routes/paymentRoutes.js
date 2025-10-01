// routes/subscriptionRoutes.js
const express = require("express");
const { checkSubscriptionStatus } = require("../controllers/paymentController");
const router = express.Router();

// GET /api/subscription/status/:userId
router.get("/status/:userId", checkSubscriptionStatus);

module.exports = router;
