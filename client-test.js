const io = require("socket.io-client");
const userModel = require("./src/models/userModel");

// Connecte le candidat au serveur
const socket = io("http://localhost:7001");

// Enregistre l'userId côté serveur (pour que sendNotification sache où envoyer)
const userId = "68a514ec29eb20c1d82e3cfe"; // ID du candidat
socket.emit("register", userId);

// Écoute les notifications
socket.on("notification", (message) => {
  console.log("Notification reçue :", message);
});
