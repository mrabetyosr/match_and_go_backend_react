const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const Reaction = require("../models/reactionModel");
const Post = require("../models/postModel");
const Comment = require("../models/commentModel");
const Reply = require("../models/replyModel"); 





/////////////////////// REACTION CONTROLLER → create a new reaction (on post, comment, or reply; only candidate or company) ///////////////////////

module.exports.creatreact = async (req, res) => {
  try {
    // 🔑 Vérif token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Access denied. No token provided." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const connectedUser = await User.findById(decoded.id);

    if (!connectedUser || !["candidate", "company"].includes(connectedUser.role)) {
      return res.status(403).json({ message: "Only candidates and companies can react." });
    }

    // 📥 Get params & body
    const { type } = req.body;
    const { postId, commentId, replyId } = req.params;

    if (!type) return res.status(400).json({ message: "The type of reaction is mandatory." });
    if (!postId && !commentId && !replyId) {
      return res.status(400).json({ message: "A reaction must target a post, a comment OR a reply." });
    }

    // ✅ Vérifier existence du target
    if (postId) {
      const post = await Post.findById(postId);
      if (!post) return res.status(404).json({ message: "Post not found." });
    }
    if (commentId) {
      const comment = await Comment.findById(commentId);
      if (!comment) return res.status(404).json({ message: "Comment not found." });
    }
    if (replyId) {
      const reply = await Reply.findById(replyId);
      if (!reply) return res.status(404).json({ message: "Reply not found." });
    }

    // ⚡ Vérifier si une réaction existe déjà (peu importe le type)
    let existingReaction = await Reaction.findOne({
      user: connectedUser._id,
      ...(postId ? { post: postId } : {}),
      ...(commentId ? { comment: commentId } : {}),
      ...(replyId ? { reply: replyId } : {}),
    });

    if (existingReaction) {
      if (existingReaction.type === type) {
        // 🔹 Même type → toggle (supprimer)
        await existingReaction.deleteOne();
        return res.status(200).json({ message: "Reaction removed." });
      } else {
        // 🔹 Autre type → update
        existingReaction.type = type;
        await existingReaction.save();
        return res.status(200).json({ message: "Reaction updated.", reaction: existingReaction });
      }
    }

    // ✅ Créer une nouvelle réaction
    const reaction = await Reaction.create({
      type,
      user: connectedUser._id,
      ...(postId ? { post: postId } : {}),
      ...(commentId ? { comment: commentId } : {}),
      ...(replyId ? { reply: replyId } : {}),
    });

    return res.status(201).json({ message: "Reaction successfully added.", reaction });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error.", error: error.message });
  }
};







/////////////////////// REACTION CONTROLLER → Get count of reactions on a specific post ///////////////////////

module.exports.getreacetcount = async (req, res) => {
  try {
    // 🔑 Vérif token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Access denied. No token provided." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const connectedUser = await User.findById(decoded.id);

    if (!connectedUser || !["candidate", "company"].includes(connectedUser.role)) {
      return res.status(403).json({ message: "Only candidates and companies can consult the reactions." });
    }

    const { postId, commentId } = req.params;
    const { type } = req.query; // 👉 on utilise query pour filtrer optionnellement

    if (!postId && !commentId) {
      return res.status(400).json({ message: "A postId or a commentId must be provided." });
    }

    // 🔎 Construire le filtre
    let filter = {};
    if (postId) filter.post = postId;
    if (commentId) filter.comment = commentId;
    if (type) filter.type = type; // facultatif : filtrer par type

    // ⚡ Compter
    const count = await Reaction.countDocuments(filter);

    // ✅ Renvoyer le résultat
    return res.status(200).json({
      
      count,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error.", error: error.message });
  }
};





/////////////////////// REACTION CONTROLLER → Get count of reactions on a specific comment ///////////////////////

module.exports.getcountcoment = async (req, res) => {
  try {
    // 🔑 Vérif token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Access denied. No token provided." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const connectedUser = await User.findById(decoded.id);

    if (!connectedUser || !["candidate", "company"].includes(connectedUser.role)) {
      return res.status(403).json({ message: "Only candidates and companies can consult the reactions." });
    }

    const { postId, commentId } = req.params;
    const { type } = req.query; // 👉 ex: ?type=like

    if (!postId && !commentId) {
      return res.status(400).json({ message: "A postId or a commentId must be provided." });
    }

    // 📌 Construire le filtre
    const filter = {
      ...(postId ? { post: postId } : {}),
      ...(commentId ? { comment: commentId } : {}),
      ...(type ? { type } : {}),
    };

    // 📊 Compter les réactions
    const totalReactions = await Reaction.countDocuments(filter);

    // 📊 Si tu veux aussi le détail par type :
    const breakdown = await Reaction.aggregate([
      { $match: filter },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]);

    return res.status(200).json({
      message: "Counter successfully recovered.",
      total: totalReactions,
      breakdown, // ex: [ { _id: "like", count: 5 }, { _id: "support", count: 2 } ]
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error.", error: error.message });
  }
};





/////////////////////// REACTION CONTROLLER → Add a reaction to a reply ///////////////////////

module.exports.postreactreply = async (req, res) => {
  try {
    // 🔑 Vérif token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Access denied. No token provided." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const connectedUser = await User.findById(decoded.id);

    if (!connectedUser || !["candidate", "company"].includes(connectedUser.role)) {
      return res.status(403).json({ message: "Only candidates and companies can add a reaction." });
    }

    const { replyId } = req.params;
    const { type } = req.body; // 👉 en POST, le type vient du body

    if (!type) {
      return res.status(400).json({ message: "The type of reaction is mandatory." });
    }

    // ✅ Vérifier l'existence de la reply
    const reply = await Reply.findById(replyId);
    if (!reply) {
      return res.status(404).json({ message: "Reply not found." });
    }

    // 🔎 Vérifier si l’utilisateur a déjà réagi avec le même type
    const existingReaction = await Reaction.findOne({
      user: connectedUser._id,
      reply: replyId,
      type,
    });

    if (existingReaction) {
      return res.status(400).json({ message: "You have already added this reaction." });
    }

    // ✅ Créer la réaction
    const reaction = await Reaction.create({
      type,
      user: connectedUser._id,
      reply: replyId,
    });

    return res.status(201).json({
      message: "Reaction successfully added on the reply.",
      reaction,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error.", error: error.message });
  }
};





/////////////////////// REACTION CONTROLLER → Count reactions for a reply ///////////////////////

module.exports.countreactreply = async (req, res) => {
  try {
    // 🔑 Vérif token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Access denied. No token provided." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const connectedUser = await User.findById(decoded.id);

    if (!connectedUser || !["candidate", "company"].includes(connectedUser.role)) {
      return res.status(403).json({ message: "Only candidates and companies can consult the reactions." });
    }

    const { replyId } = req.params;
    const { type } = req.query; // facultatif

    if (!replyId) {
      return res.status(400).json({ error: "A replyId must be provided." });
    }

    // ✅ Vérifier si la reply existe
    const reply = await Reply.findById(replyId);
    if (!reply) {
      return res.status(404).json({ error: "Reply not found." });
    }

    // 🔎 Construire le filtre
    const filter = { reply: replyId, ...(type ? { type } : {}) };

    // 📊 Compter
    const count = await Reaction.countDocuments(filter);

    // ✅ Renvoyer toujours le même format
    return res.status(200).json({ count });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error.", details: error.message });
  }
};





/////////////////////// REACTION CONTROLLER → List reactions for a post ///////////////////////

module.exports.listReactionsPost = async (req, res) => {
  try {
    // 🔑 Vérif token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Access denied. No token provided." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const connectedUser = await User.findById(decoded.id);

    if (!connectedUser || !["candidate", "company"].includes(connectedUser.role)) {
      return res.status(403).json({ message: "Only candidates and companies can consult the reactions." });
    }

    const { postId } = req.params;
    if (!postId) {
      return res.status(400).json({ message: "postId required." });
    }

    // 🔎 Récup toutes les réactions + username de l'utilisateur
    const reactions = await Reaction.find({ post: postId })
      .populate("user", "username role logo"); // 👉 on ne prend que ce qu’on veut

    // 🔄 Regrouper par type
    const grouped = reactions.reduce((acc, reaction) => {
      if (!acc[reaction.type]) {
        acc[reaction.type] = { count: 0, users: [] };
      }
      acc[reaction.type].count++;
      acc[reaction.type].users.push({
        _id: reaction.user._id,
        username: reaction.user.username,
        role: reaction.user.role,
        logo: reaction.user.logo
      });
      return acc;
    }, {});

    return res.status(200).json(grouped);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error.", error: error.message });
  }
};





/////////////////////// REACTION CONTROLLER → List reactions for a comment ///////////////////////

module.exports.listReactionsComment = async (req, res) => { 
  try {
    // 🔑 Vérif token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Access denied. No token provided." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const connectedUser = await User.findById(decoded.id);

    if (!connectedUser || !["candidate", "company"].includes(connectedUser.role)) {
      return res.status(403).json({ message: "Only candidates and companies can consult the reactions." });
    }

    const { commentId } = req.params;
    if (!commentId) {
      return res.status(400).json({ message: "commentId required." });
    }

    // 🔎 Récup toutes les réactions du commentaire + username de l'utilisateur
    const reactions = await Reaction.find({ comment: commentId })
      .populate("user", "username role logo");

    // 🔄 Regrouper par type
    const grouped = reactions.reduce((acc, reaction) => {
      if (!acc[reaction.type]) {
        acc[reaction.type] = { count: 0, users: [] };
      }
      acc[reaction.type].count++;
      acc[reaction.type].users.push({
        _id: reaction.user._id,
        username: reaction.user.username,
        role: reaction.user.role,
        logo: reaction.user.logo
      });
      return acc;
    }, {});

    return res.status(200).json(grouped);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error.", error: error.message });
  }
};





/////////////////////// REACTION CONTROLLER → List reactions for a reply ///////////////////////

module.exports.listReactionsReply = async (req, res) => { 
  try {
    // 🔑 Vérif token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Access denied. No token provided." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const connectedUser = await User.findById(decoded.id);

    if (!connectedUser || !["candidate", "company"].includes(connectedUser.role)) {
      return res.status(403).json({ message: "Only candidates and companies can consult the reactions." });
    }

    const { replyId } = req.params;
    if (!replyId) {
      return res.status(400).json({ message: "replyId requis." });
    }

    // 🔎 Récup toutes les réactions de la reply + infos utilisateur
    const reactions = await Reaction.find({ reply: replyId })
      .populate("user", "username role logo");

    // 🔄 Regrouper par type
    const grouped = reactions.reduce((acc, reaction) => {
      if (!acc[reaction.type]) {
        acc[reaction.type] = { count: 0, users: [] };
      }
      acc[reaction.type].count++;
      acc[reaction.type].users.push({
        _id: reaction.user._id,
        username: reaction.user.username,
        role: reaction.user.role,
        logo: reaction.user.logo
      });
      return acc;
    }, {});

    return res.status(200).json(grouped);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error.", error: error.message });
  }
};





/////////////////////// REACTION CONTROLLER → List reactions for a comment ///////////////////////

module.exports.listReactionsComment = async (req, res) => {  
  try {
    // 🔑 Vérif token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Access denied. No token provided." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const connectedUser = await User.findById(decoded.id);

    if (!connectedUser || !["candidate", "company"].includes(connectedUser.role)) {
      return res.status(403).json({ message: "Only candidates and companies can consult the reactions." });
    }

    const { commentId } = req.params;
    if (!commentId) {
      return res.status(400).json({ message: "commentId required." });
    }

    // 🔎 Récup toutes les réactions du commentaire + infos utilisateur
    const reactions = await Reaction.find({ comment: commentId })
      .populate("user", "username role logo");

    // 🔄 Regrouper par type
    const grouped = reactions.reduce((acc, reaction) => {
      if (!acc[reaction.type]) {
        acc[reaction.type] = { count: 0, users: [] };
      }
      acc[reaction.type].count++;
      acc[reaction.type].users.push({
        _id: reaction.user._id,
        username: reaction.user.username,
        role: reaction.user.role,
        logo: reaction.user.logo
      });
      return acc;
    }, {});

    return res.status(200).json(grouped);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error.", error: error.message });
  }
};





///////////////

module.exports.removeReaction = async (req, res) => {
  try {
    // 🔑 Vérif token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Access denied. No token provided." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const connectedUser = await User.findById(decoded.id);

    if (!connectedUser || !["candidate", "company"].includes(connectedUser.role)) {
      return res.status(403).json({ message: "Only candidates and companies can remove reactions." });
    }

    const { postId, commentId, replyId } = req.params;

    if (!postId && !commentId && !replyId) {
      return res.status(400).json({ message: "A reaction must target a post, a comment OR a reply." });
    }

    // 🔍 Chercher la réaction existante
    const existingReaction = await Reaction.findOne({
      user: connectedUser._id,
      ...(postId ? { post: postId } : {}),
      ...(commentId ? { comment: commentId } : {}),
      ...(replyId ? { reply: replyId } : {}),
    });

    if (!existingReaction) {
      return res.status(404).json({ message: "No reaction found to remove." });
    }

    // ❌ Supprimer la réaction
    await existingReaction.deleteOne();

    return res.status(200).json({ message: "Reaction successfully removed." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error.", error: error.message });
  }
};



