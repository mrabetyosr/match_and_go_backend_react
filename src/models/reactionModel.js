const mongoose = require("mongoose");

const reactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["like", "celebrate", "support", "insightful", "curious"], // LinkedIn-style
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 🔗 Polymorphic reference: can target Post, Comment, or Reply
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },
    comment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    },
    reply: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reply",
    },
  },
  { timestamps: true }
);

// ✅ Validation: must target exactly one of post/comment/reply
reactionSchema.pre("save", function (next) {
  const targets = [this.post, this.comment, this.reply].filter(Boolean);
  if (targets.length === 0) {
    return next(new Error("A reaction must target a post, a comment, or a reply."));
  }
  if (targets.length > 1) {
    return next(new Error("A reaction can only target ONE entity (post, comment, or reply)."));
  }
  next();
});

// ✅ Prevent duplicate reactions (same user, same target, same type)
// ✅ Uniqueness only when "post" is set
reactionSchema.index(
  { user: 1, post: 1, type: 1 },
  { unique: true, partialFilterExpression: { post: { $exists: true, $ne: null } } }
);

// ✅ Uniqueness only when "comment" is set
reactionSchema.index(
  { user: 1, comment: 1, type: 1 },
  { unique: true, partialFilterExpression: { comment: { $exists: true, $ne: null } } }
);

// ✅ Uniqueness only when "reply" is set
reactionSchema.index(
  { user: 1, reply: 1, type: 1 },
  { unique: true, partialFilterExpression: { reply: { $exists: true, $ne: null } } }
);


module.exports = mongoose.model("Reaction", reactionSchema);