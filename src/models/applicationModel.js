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
      enum: ["pending","interview_scheduled", "accepted", "rejected"],
      default: "pending",
    },

    
    cv: { type: String, required: true },

 
    motivationLetter: { type: String, required: true },

   
    linkedin: { type: String },
    github: { type: String },
     phoneNumber: { type: String },
    location: { type: String },
    dateOfBirth: { type: Date },
    email: { type: String },

    // NOUVEAU: Informations sur la soumission de quiz
    quizSubmission: {
      hasSubmitted: { type: Boolean, default: false },
      submissionId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "quizAnswer" 
      },
      score: { type: Number },
      totalPossibleScore: { type: Number },
      percentage: { type: Number },
      quizTitle: { type: String },
      submittedAt: { type: Date }
    }
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Application ||
  mongoose.model("Application", applicationSchema);
