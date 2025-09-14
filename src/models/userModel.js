const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
      enum: ["admin", "candidate", "company"],
    },
    image_User: {
      type: String,
      default: "user.png",
    },
    cover_User: {
      type: String,
      default: "defaultCover.png",
    },

    candidateInfo: {
      phoneNumber: { type: String },
      location: { type: String },
      dateOfBirth: { type: Date },
      savedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Offer" }],
    },

    companyInfo: {
      description: { type: String },
      location: { type: String },
      category: {
        type: String,
        enum: [
          "Tech",
          "Advertising&Marketing",
          "Culture&Media",
          "Consulting&Audit",
          "Education&Training",
          "Finance&Banking",
        ],
      },
      founded: { type: Number },
      size: { type: String },
      website: { type: String },
      socialLinks: {
        linkedin: { type: String },
      },
    },

  hasRatedApp: { type: Boolean, default: false }, // ✅ ajout
  loginCount: { type: Number, default: 0 }, // Track logins



    // 🔹 Add for password reset
    resetPasswordToken: { type: String },
    resetPasswordExpire: { type: Date },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.User || mongoose.model("User", userSchema);
