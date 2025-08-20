const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    jobTitle: { type: String, required: true },
    jobType: { type: String, required: true },
    remote: { type: Boolean, default: false },
    jobSalary: { type: Number, default: 0 },
    duration: { type: String },
    jobSlots: { type: Number, default: 1 },
    jobDate: { type: Date },
    applicationDeadline: { type: Date },
    experience: { type: String },
    education: { type: String },
    languages: [{ type: String }],
    skills: [{ type: String }],
    tags: [{ type: String }],
    description: { type: String },
    responsibilities: [{ type: String }],
    requirements: [{ type: String }],
    benefits: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.models.Offer || mongoose.model("Offer", offerSchema);
