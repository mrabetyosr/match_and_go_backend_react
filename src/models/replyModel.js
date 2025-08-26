const mongoose = require("mongoose");

const replySchema = new mongoose.Schema(
  {
    content: { 
      type: String, 
      required: true,
      trim: true // tu peux ajouter ça pour éviter les espaces inutiles
    },
    comment: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Comment", 
      required: true 
    },
    author: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Reply", replySchema);