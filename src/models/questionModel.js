// models/Question.js
const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true, index: true },

    questionText: { type: String, required: true, trim: true }, // 🔹 replaces "text"

    questionType: { 
      type: String, 
      enum: ["multiple-choice", "true-false", "open"], 
      default: "multiple-choice" 
    },

    choices: {
      type: [String], 
      required: true, 
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length >= 2,
        message: "At least 2 choices are required."
      }
    },

    correctAnswer: { type: String, required: true, trim: true },

    score: { type: Number, default: 1, min: 0 },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Question || mongoose.model("Question", questionSchema);
