// models/interviewModel.js
const mongoose = require("mongoose");

const interviewSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      required: true,
    },
    scheduledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: { type: Date, required: true },
    meetLink: { type: String, required: true },
    message: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Interview ||
  mongoose.model("interview", interviewSchema);
