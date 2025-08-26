const mongoose = require("mongoose");
const User = require("./userModel"); // ton modèle User

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      validate: {
        validator: async function(userId) {
          const user = await User.findById(userId);
          return user && (user.role === "candidate" || user.role === "company");
        },
        message: "Seuls les utilisateurs avec le rôle candidate ou company peuvent créer un post."
      }
    },
    content: { type: String, required: true },
    mediaUrl: { type: String },
    photo: { type: String, default: "client.png" }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Post", postSchema);