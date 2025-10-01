const jwt = require("jsonwebtoken");
const User = require("../models/userModel"); // adjust path if needed
const Offer = require("../models/offerModel");  // <--- vérifie ce chemin
const Post = require("../models/postModel");  // <--- vérifie ce chemin
const Application = require("../models/applicationModel");
const Interview = require("../models/interviewModel");

// Count all candidates
const countCandidates = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const adminUser = await User.findById(decoded.id);

    if (!adminUser || adminUser.role !== "admin") {
      return res.status(403).json({ message: "Only admins can access this info." });
    }

    const candidateCount = await User.countDocuments({ role: "candidate" });
    return res.status(200).json({ candidates: candidateCount });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Count all companies
const countCompanies = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const adminUser = await User.findById(decoded.id);

    if (!adminUser || adminUser.role !== "admin") {
      return res.status(403).json({ message: "Only admins can access this info." });
    }

    const companyCount = await User.countDocuments({ role: "company" });
    return res.status(200).json({ companies: companyCount });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

const getOfferCount = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const adminUser = await User.findById(decoded.id);

    if (!adminUser || adminUser.role !== "admin") {
      return res.status(403).json({ message: "Only admins can access this info." });
    }

    const count = await Offer.countDocuments();
    res.status(200).json({ offers: count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Récupérer le nombre de posts
const getPostCount = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const adminUser = await User.findById(decoded.id);

    if (!adminUser || adminUser.role !== "admin") {
      return res.status(403).json({ message: "Only admins can access this info." });
    }

    const count = await Post.countDocuments();
    res.status(200).json({ posts: count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};



const getOffersStatsPerDay = async (req, res) => {
  try {
    // Vérification token admin
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const adminUser = await User.findById(decoded.id);
    if (!adminUser || adminUser.role !== "admin") {
      return res.status(403).json({ message: "Only admins can access this info." });
    }

    // Agrégation MongoDB
    const stats = await Offer.aggregate([
      {
        $lookup: {
          from: "users",           // collection User
          localField: "companyId",
          foreignField: "_id",
          as: "company",
        },
      },
      { $unwind: "$company" },
      {
        $group: {
          _id: {
            day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            company: "$company.username",
          },
          totalOffers: { $sum: 1 },
          offers: { $push: "$jobTitle" },
          logo: { $first: "$company.image_User" } // récupère le logo de l'entreprise
        },
      },
      { $sort: { "_id.day": 1 } },
    ]);

    // Transformer pour le front
    const graphData = {};

    stats.forEach(item => {
      const day = item._id.day;
      const company = item._id.company;

      if (!graphData[day]) graphData[day] = {};
      graphData[day][company] = {
        totalOffers: item.totalOffers,
        offers: item.offers,
        logo: item.logo
      };
    });

    res.status(200).json(graphData);

  } catch (error) {
    console.error("Error in getOffersStatsPerDay:", error);
    res.status(500).json({ message: "Server error", error });
  }
};




const getPostsStatsPerDay = async (req, res) => {
  try {
    // 🔹 Vérification du token et rôle admin
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const adminUser = await User.findById(decoded.id);
    if (!adminUser || adminUser.role !== "admin") {
      return res.status(403).json({ message: "Only admins can access this info." });
    }

    // 🔹 Agrégation MongoDB
    const stats = await Post.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "author",
          foreignField: "_id",
          as: "authorInfo",
        },
      },
      { $unwind: "$authorInfo" },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
            authorId: "$authorInfo._id",
            username: { $ifNull: ["$authorInfo.username", "Unknown"] },
            role: "$authorInfo.role",
            image_User: { $ifNull: ["$authorInfo.image_User", "user.png"] },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    // 🔹 Transformation pour le front
    const formattedStats = stats.map((item) => ({
      date: `${item._id.year}-${String(item._id.month).padStart(2, "0")}-${String(
        item._id.day
      ).padStart(2, "0")}`,
      count: item.count,
      user: {
        id: item._id.authorId,
        username: item._id.username,
        image: item._id.image_User,
      },
    }));

    res.json(formattedStats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur serveur", error });
  }
};



const getOffersWithApplicants = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const adminUser = await User.findById(decoded.id);
    if (!adminUser || adminUser.role !== "admin") {
      return res.status(403).json({ message: "Only admins can access this info." });
    }

    const offers = await Offer.find().populate({
      path: "companyId",
      select: "username image_User"
    });

    const results = await Promise.all(
      offers.map(async (offer) => {
        // Construire URL complète
        const company = offer.companyId
          ? { 
              username: offer.companyId.username, 
              logo: `http://localhost:7001/images/${offer.companyId.image_User}` 
            }
          : { username: "Unknown", logo: "http://localhost:7001/images/user.png" };

        const applications = await Application.find({ offerId: offer._id })
          .populate({ path: "candidateId", select: "username image_User" });

        const candidates = applications.map(app => {
          const candidate = app.candidateId
            ? { 
                username: app.candidateId.username, 
                logo: `http://localhost:7001/images/${app.candidateId.image_User}` 
              }
            : { username: "Unknown", logo: "http://localhost:7001/images/user.png" };
          return { ...candidate, status: app.status };
        });

        return {
          offerId: offer._id,
          jobTitle: offer.jobTitle,
          company,
          maxCandidates: offer.jobSlots,
          applicationDeadline: offer.applicationDeadline,
          applicants: candidates
        };
      })
    );

    res.status(200).json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getScheduledMeetings = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(403).json({ message: "User not found." });

    // Filtre si pas admin
    let query = {};
    if (user.role !== "admin") {
      query = { scheduledBy: user._id };
    }

    const meetings = await Interview.find(query)
      .populate({
        path: "applicationId",
        populate: [
          { path: "candidateId", select: "username email image_User" },
          { 
            path: "offerId", 
            populate: { 
              path: "companyId", 
              select: "username email image_User companyInfo" 
            } 
          }
        ]
      })
      .populate("scheduledBy", "username email")
      .sort({ date: 1 });

    res.status(200).json(meetings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};



module.exports = {
  countCandidates,
  countCompanies,
  getOfferCount,
  getPostCount,
  getOffersStatsPerDay,
  getPostsStatsPerDay,
  getOffersWithApplicants,
  getScheduledMeetings  
};