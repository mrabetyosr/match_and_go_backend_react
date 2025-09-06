const jwt = require("jsonwebtoken");
const Post = require("../models/postModel");
const User = require("../models/userModel");
const Comment = require("../models/commentModel");
const Reaction = require("../models/reactionModel");
const Share = require("../models/shareModel");
const Reply = require("../models/replyModel");





/////////////////////// POST CONTROLLER → Create a new post ///////////////////////

module.exports.creerPost = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) 
      return res.status(401).json({ message: "Access denied. No token provided." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const connectedUser = await User.findById(decoded.id);

    if (!connectedUser || !["candidate", "company"].includes(connectedUser.role)) {
      return res.status(403).json({ message: "Only candidates and companies can create posts." });
    }

    const content = req.body.content;
    if (!content) 
      return res.status(400).json({ message: "Post content is required." });

    // ✅ Build post object conditionally
    const postData = { author: connectedUser._id, content };

    if (req.body.mediaUrl) postData.mediaUrl = req.body.mediaUrl;
    if (req.files?.photo?.length > 0) postData.photo = `/images/${req.files.photo[0].filename}`;
    if (req.files?.document?.length > 0) postData.document = `/images/${req.files.document[0].filename}`;

    const post = new Post(postData);
    await post.save();

    res.status(201).json({ message: "Post successfully created", post });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};






/////////////////////// POST CONTROLLER → Update an existing post ///////////////////////

module.exports.updatePost = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Access denied. No token provided." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const connectedUser = await User.findById(decoded.id);

    if (!connectedUser || !["candidate", "company"].includes(connectedUser.role)) {
      return res.status(403).json({ message: "Only candidates and companies can update posts." });
    }

    const postId = req.params.id;
    const post = await Post.findById(postId);

    if (!post) return res.status(404).json({ message: "Post not found." });
    if (!post.author.equals(connectedUser._id)) {
      return res.status(403).json({ message: "You can only update your own posts." });
    }

    // Retrieve data to update
    const { content, mediaUrl } = req.body;
    if (content) post.content = content;
    if (mediaUrl) post.mediaUrl = mediaUrl;
    if (req.file) post.photo = `/images/${req.file.filename}`;

    await post.save();
    res.status(200).json({ message: "Post updated successfully", post });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};





/////////////////////// POST CONTROLLER → Delete a post (and its related data) ///////////////////////

module.exports.removePost = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token)
      return res.status(401).json({ message: "Access denied. No token provided." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const connectedUser = await User.findById(decoded.id);

    if (
      !connectedUser ||
      !["candidate", "company", "admin"].includes(connectedUser.role)
    ) {
      return res
        .status(403)
        .json({ message: "Only candidates, companies, or admins can delete posts." });
    }

    const postId = req.params.id;
    const post = await Post.findById(postId);

    if (!post) return res.status(404).json({ message: "Post not found." });

    // ✅ Admin peut supprimer n'importe quel post, sinon l'auteur uniquement
    if (
      connectedUser.role !== "admin" &&
      post.author.toString() !== connectedUser._id.toString()
    ) {
      return res.status(403).json({
        message: "You can only delete your own posts unless you are an admin.",
      });
    }

    // 🔄 Chercher les commentaires liés au post
    const comments = await Comment.find({ post: postId });

    for (const comment of comments) {
      // 🔄 Supprimer les réactions liées au commentaire
      await Reaction.deleteMany({ comment: comment._id });

      // 🔄 Supprimer les replies liés au commentaire
      const replies = await Reply.find({ comment: comment._id });

      for (const reply of replies) {
        // Supprimer les réactions des replies
        await Reaction.deleteMany({ reply: reply._id });
      }

      // Supprimer les replies eux-mêmes
      await Reply.deleteMany({ comment: comment._id });
    }

    // Supprimer les commentaires eux-mêmes
    await Comment.deleteMany({ post: postId });

    // 🔄 Supprimer les réactions liées directement au post
    await Reaction.deleteMany({ post: postId });

    // 🔄 Supprimer les partages liés
    await Share.deleteMany({ post: postId });

    // 🔄 Supprimer le post lui-même
    await post.deleteOne();

    res.status(200).json({
      message: "Post and all related comments, replies, reactions, and shares deleted successfully"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};






/////////////////////// POST CONTROLLER → Get all posts (with reactions & comments count) ///////////////////////



module.exports.listPosts = async (req, res) => {
  try {
    // 🔑 Vérification token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token)
      return res
        .status(401)
        .json({ message: "Access denied. No token provided." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const connectedUser = await User.findById(decoded.id);

    if (!connectedUser) {
      return res.status(403).json({ message: "Invalid user." });
    }

    // 📌 Récupérer tous les posts + infos de l’auteur
    const posts = await Post.find()
      .populate("author", "username role logo")
      .sort({ createdAt: -1 });

    // 🔄 Ajouter nb de réactions, de commentaires et de partages pour chaque post
    const postsWithCounts = await Promise.all(
      posts.map(async (post) => {
        const reactionsCount = await Reaction.countDocuments({ post: post._id });
        const commentsCount = await Comment.countDocuments({ post: post._id });
        const sharesCount = await Share.countDocuments({ post: post._id });

        return {
          ...post.toObject(),
          reactionsCount,
          commentsCount,
          sharesCount, // 🔹 Added share count
        };
      })
    );

    return res.status(200).json(postsWithCounts);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Erreur serveur.", error: error.message });
  }
};






/////////////////////// POST CONTROLLER → Get all posts by a specific user (with reactions & comments count) ///////////////////////

module.exports.listPostsByUser = async (req, res) => {
  try {
    // 🔑 Check token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token)
      return res
        .status(401)
        .json({ message: "Access denied. No token provided." });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const connectedUser = await User.findById(decoded.id);

    if (!connectedUser) {
      return res.status(403).json({ message: "Invalid user." });
    }

    // 📌 Get userId from params
    const { userId } = req.params;

    // 📌 Get all posts by that user
    const posts = await Post.find({ author: userId })
      .populate("author", "username role logo") // author details
      .sort({ createdAt: -1 });

    if (!posts.length) {
      return res.status(404).json({ message: "No posts found for this user." });
    }

    // 🔄 Add reaction + comment + shares details
    const postsWithDetails = await Promise.all(
      posts.map(async (post) => {
        // Get reactions with user info
        const reactions = await Reaction.find({ post: post._id })
          .populate("user", "username role logo");

        // Get comments with author info
        const comments = await Comment.find({ post: post._id })
          .populate("author", "username role logo")
          .sort({ createdAt: -1 });

        // Get shares with user info (assuming you have a Share model)
        const shares = await Share.find({ post: post._id })
          .populate("user", "username role logo");

        return {
          ...post.toObject(),
          reactionsCount: reactions.length,
          reactions, // detailed reactions with user
          commentsCount: comments.length,
          comments, // detailed comments
          sharesCount: shares.length,
          shares, // detailed shares with user
        };
      })
    );

    return res.status(200).json(postsWithDetails);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Server error.", error: error.message });
  }
};






/////////////////////// POST CONTROLLER → Get posts with many reactions & comments ///////////////////////

module.exports.listpostwithmanyreaction = async (req, res) => {
  try {
    // 📌 Récupérer tous les posts + infos de l’auteur
    const posts = await Post.find()
      .populate("author", "username role logo")
      .sort({ createdAt: -1 });

    // 🔄 Ajouter nb de réactions, commentaires et partages pour chaque post
    const postsWithCounts = await Promise.all(
      posts.map(async (post) => {
        const reactionsCount = await Reaction.countDocuments({ post: post._id });
        const commentsCount = await Comment.countDocuments({ post: post._id });
        const sharesCount = await Share.countDocuments({ post: post._id });

        return {
          ...post.toObject(),
          reactionsCount,
          commentsCount,
          sharesCount,
        };
      })
    );

    // 🔥 Filtrer uniquement les posts qui ont > 5 réactions
    const filteredPosts = postsWithCounts.filter(
      (post) => post.reactionsCount >= 1
    );

    // 🔥 Trier par nb de réactions décroissant
    filteredPosts.sort((a, b) => b.reactionsCount - a.reactionsCount);

    return res.status(200).json(filteredPosts);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Erreur serveur.", error: error.message });
  }
};
