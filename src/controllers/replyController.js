const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const Comment = require("../models/commentModel");
const Reply = require("../models/replyModel");
const Reaction = require("../models/reactionModel"); // 👈 add this





/////////////////////// COMMENT CONTROLLER → Create reply for a specific comment ///////////////////////

module.exports.creerreplycomment = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const connectedUser = await User.findById(decoded.id);

    if (!connectedUser || !["candidate", "company"].includes(connectedUser.role)) {
      return res.status(403).json({ message: "Only candidates and companies can reply to a comment." });
    }

    // Récupérer l'id du commentaire depuis l'URL
    const { commentId } = req.params;
    const { content } = req.body;

    // Vérifier que le commentaire existe
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found." });
    }

    // Créer la reply
    const reply = await Reply.create({
      content,
      comment: commentId,
      author: connectedUser._id,
    });

    return res.status(201).json({
      message: "Response successfully created",
      reply,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "server error", error: error.message });
  }
};





/////////////////////// REPLY CONTROLLER → Delete reply ///////////////////////

module.exports.deletereply = async (req, res) => {
  try {
    // 🔑 Check token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const connectedUser = await User.findById(decoded.id);

    // 🔑 Check role
    if (!connectedUser || !["candidate", "company", "admin"].includes(connectedUser.role)) {
      return res.status(403).json({ message: "Only candidates, companies, or admins can delete replies." });
    }

    // 📌 Get reply ID
    const { replyId } = req.params;

    // 📌 Check if reply exists
    const reply = await Reply.findById(replyId);
    if (!reply) {
      return res.status(404).json({ message: "Reply not found." });
    }

    // ✅ Author can delete only their own reply (unless admin)
    if (
      connectedUser.role !== "admin" &&
      reply.author.toString() !== connectedUser._id.toString()
    ) {
      return res.status(403).json({ message: "You can only delete your own replies unless you are an admin." });
    }

    // 🔄 Delete reactions linked to this reply
    await Reaction.deleteMany({ reply: replyId });

    // 🔄 Delete reply itself
    await reply.deleteOne();

    res.status(200).json({
      message: "Reply and its related reactions deleted successfully",
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};






// controllers/replyController.js
module.exports.listreplycomment = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const connectedUser = await User.findById(decoded.id);

    if (!connectedUser || !["candidate", "company"].includes(connectedUser.role)) {
      return res.status(403).json({ message: "Only candidates and companies can view replies." });
    }

    const { commentId } = req.params;

    // Vérifier que le commentaire existe
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found." });
    }

    // Récupérer toutes les replies pour ce commentaire
    const replies = await Reply.find({ comment: commentId })
      .populate("author", "username logo role")  // inclure info de l'auteur
      .sort({ createdAt: 1 }); // optionnel: trier par date

    return res.status(200).json({ replies });
    
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};
