const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const Post = require("../models/postModel");
const Share = require("../models/shareModel");





/////////////////////// POST CONTROLLER → Share a post ///////////////////////

module.exports.sharePost = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const connectedUser = await User.findById(decoded.id);

    if (!connectedUser || !["candidate", "company"].includes(connectedUser.role)) {
      return res.status(403).json({ message: "Only candidates and companies can share posts." });
    }

    // 🔥 récupérer l'id du post depuis l'URL
    const postId = req.params.id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    const alreadyShared = await Share.findOne({ post: postId, sharedBy: connectedUser._id });
    if (alreadyShared) {
      return res.status(400).json({ message: "You have already shared this post." });
    }

    const newShare = new Share({
      post: postId,
      sharedBy: connectedUser._id
    });

    await newShare.save();

    return res.status(201).json({
      message: "Post shared successfully.",
      share: newShare
    });
  } catch (error) {
    console.error("Error while sharing post:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};





/////////////////////// POST CONTROLLER → Get share count by post ///////////////////////

module.exports.getShareCountByPost = async (req, res) => {
  try {
    // Vérifier le token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const connectedUser = await User.findById(decoded.id);

    if (!connectedUser || !["candidate", "company"].includes(connectedUser.role)) {
      return res.status(403).json({ message: "Only candidates and companies can view shares." });
    }

    // Récupérer le postId depuis l'URL
    const postId = req.params.id;

    // Vérifier que le post existe
    const postExists = await Post.exists({ _id: postId });
    if (!postExists) {
      return res.status(404).json({ message: "Post not found." });
    }

    // Compter les partages
    const shareCount = await Share.countDocuments({ post: postId });

    return res.status(200).json({ shareCount });
  } catch (error) {
    console.error("Error while getting share count:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
};





/////////////////////// USER CONTROLLER → Get all shared posts by a user ///////////////////////

module.exports.listSharedPostsByUser = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Access denied. No token provided." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const connectedUser = await User.findById(decoded.id);

    if (!connectedUser) {
      return res.status(403).json({ message: "Invalid user." });
    }

    // 📌 Récupérer userId depuis params
    const { userId } = req.params;

    // 🔒 Seul l'owner ou un admin peut voir ses partages
    if (connectedUser._id.toString() !== userId && connectedUser.role !== "admin") {
      return res.status(403).json({ message: "Access denied. You can only view your own shared posts." });
    }

    // 📌 Chercher dans Share, pas dans Post
    const sharedPosts = await Share.find({ sharedBy: userId })
      .populate("sharedBy", "username role logo") // infos de celui qui partage
      .populate({
        path: "post", // le post partagé
        populate: { path: "author", select: "username role logo" } // auteur du post original
      })
      .sort({ createdAt: -1 });

    if (!sharedPosts.length) {
      return res.status(404).json({ message: "No shared posts found for this user." });
    }

    return res.status(200).json(sharedPosts);
  } catch (error) {
    console.error("Error while fetching shared posts:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};
