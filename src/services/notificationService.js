const Notification = require("../models/notificationModel");
const { sendNotification } = require("../utils/socket"); // ✅ chemin correct

const notifyCandidate = async (candidateId, message) => {
  const notif = await Notification.create({ candidateId, message });
  sendNotification(candidateId, message); // maintenant ça marche
  return notif;
};

module.exports = { notifyCandidate };
