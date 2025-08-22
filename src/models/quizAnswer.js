
const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema({
  question: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true },
  selectedAnswer: { type: String, required: true },
  isCorrect: { type: Boolean, default: false },
  score: { type: Number, default: 0 },
});

const quizAnswerSchema = new mongoose.Schema(
  {
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true },
    candidate: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    answers: [answerSchema],
    totalScore: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.models.quizAnswer || mongoose.model("quizAnswer", quizAnswerSchema);
