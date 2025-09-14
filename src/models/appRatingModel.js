// models/AppRating.js
const mongoose = require("mongoose");

const appRatingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  rating: { type: Number, min: 1, max: 5, required: true },
});

module.exports = mongoose.model("AppRating", appRatingSchema);
