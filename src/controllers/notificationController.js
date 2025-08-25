const { notifyCandidate } = require("../services/notificationService");
const verifyToken = require("../middlewares/verifyToken");

app.post("/api/notify/:candidateId", verifyToken, async (req, res) => {
  try {
    const { candidateId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }

    const notif = await notifyCandidate(candidateId, message);
    res.json({ success: true, notification: notif });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
