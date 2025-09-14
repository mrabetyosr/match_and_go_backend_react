const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const AppRating = require("../models/appRatingModel");

module.exports.addAppRating = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Only allow rating after 5 logins
    if (user.loginCount < 5) {
      return res.status(400).json({ message: "You can rate the app after your 5th login" });
    }

    if (user.hasRatedApp) {
      return res.status(400).json({ message: "You already rated this app" });
    }

    const { rating } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Invalid rating" });
    }

    const appRating = new AppRating({ user: user._id, rating });
    await appRating.save();

    user.hasRatedApp = true;
    await user.save();

    res.status(201).json({
      message: "Thanks for rating the app!",
      appRating,
      hasRatedApp: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
