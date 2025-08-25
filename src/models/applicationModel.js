const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    offerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Offer",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },

    
    cv: { type: String, required: true },

 
    motivationLetter: { type: String, required: true },

   
    linkedin: { type: String },
    github: { type: String },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Application ||
  mongoose.model("Application", applicationSchema);
