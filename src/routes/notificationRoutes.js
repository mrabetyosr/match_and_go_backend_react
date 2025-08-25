const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authMiddleware");
const { notifyCandidate } = require("../services/notificationService");
const Notification = require("../models/notificationModel");

// POST /api/notify/:candidateId
router.post("/:candidateId", verifyToken, async (req, res) => {
  const { candidateId } = req.params;
  const { message } = req.body;
  if (!message) return res.status(400).json({ message: "Message required" });

  const notif = await notifyCandidate(candidateId, message);
  res.json({ success: true, notification: notif });
});

// GET /api/my-notifications
router.get("/my-notifications", verifyToken, async (req, res) => {
  const notifications = await Notification.find({ candidateId: req.user.id }).sort({ createdAt: -1 });
  res.json({ success: true, notifications });
});

module.exports = router;
