// models/Question.js
const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true, index: true },
    text: { type: String, required: true, trim: true },
    correctAnswer: { type: String, required: true, trim: true },
    wrongAnswers: {
  type: [String],
  required: true,
  validate: [
    {
      validator: (arr) => Array.isArray(arr) && arr.length >= 1,
      message: "Au moins une réponse fausse est requise.",
    },
  ],
},

    score: { type: Number, default: 1, min: 0 },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Question || mongoose.model("Question", questionSchema);
