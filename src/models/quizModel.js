// models/Quiz.js
const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema(
  {
    offer: { type: mongoose.Schema.Types.ObjectId, ref: "Offer", required: true },
    title: { type: String, required: true, trim: true },
    durationSeconds: { type: Number, default: 0, min: 0 },
    nbrQuestions: { type: Number, default: 0, min: 0 },
    totalScore: { type: Number, default: 100, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Quiz || mongoose.model("Quiz", quizSchema);
