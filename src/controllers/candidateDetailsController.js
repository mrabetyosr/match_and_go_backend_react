// controllers/candidateAdminController.js
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const Application = require("../models/applicationModel");
const quizAnswer = require("../models/quizAnswer");

// Get all candidates with application statistics
const getAllCandidatesWithStats = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const adminUser = await User.findById(decoded.id);

    if (!adminUser || adminUser.role !== "admin") {
      return res.status(403).json({ message: "Only admins can access this info." });
    }

    const candidates = await User.find({ role: "candidate" }).lean();

    const candidatesWithStats = await Promise.all(
      candidates.map(async (candidate) => {
        const applications = await Application.find({ candidateId: candidate._id });
        
        const acceptedCount = applications.filter(a => a.status === "accepted").length;
        const totalApplications = applications.length;
        
        return {
          ...candidate,
          applicationCount: totalApplications,
          successRate: totalApplications > 0 
            ? Math.round((acceptedCount / totalApplications) * 100) 
            : 0
        };
      })
    );

    res.status(200).json(candidatesWithStats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get detailed information for a specific candidate
const getCandidateDetailedInfo = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const adminUser = await User.findById(decoded.id);

    if (!adminUser || adminUser.role !== "admin") {
      return res.status(403).json({ message: "Only admins can access this info." });
    }

    const { candidateId } = req.params;

    // Get candidate info
    const candidate = await User.findById(candidateId).lean();
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    // Get all applications with populated offer and company info
    const applications = await Application.find({ candidateId })
      .populate({
        path: "offerId",
        populate: {
          path: "companyId",
          select: "username email image_User companyInfo"
        }
      })
      .sort({ createdAt: -1 })
      .lean();

    // Get quiz submissions for each application
    const applicationsWithQuizzes = await Promise.all(
      applications.map(async (app) => {
        if (app.quizSubmission?.submissionId) {
          const quizDetails = await quizAnswer.findById(app.quizSubmission.submissionId)
            .populate({
              path: "quiz",
              select: "title totalScore"
            })
            .populate({
              path: "answers.question",
              select: "questionText correctAnswer"
            });
          
          return {
            ...app,
            quizDetails
          };
        }
        return app;
      })
    );

    res.status(200).json({
      candidate,
      applications: applicationsWithQuizzes,
      stats: {
        totalApplications: applications.length,
        accepted: applications.filter(a => a.status === "accepted").length,
        rejected: applications.filter(a => a.status === "rejected").length,
        pending: applications.filter(a => a.status === "pending").length,
        interviews: applications.filter(a => a.status === "interview_scheduled").length,
        quizzesTaken: applications.filter(a => a.quizSubmission?.hasSubmitted).length,
        averageQuizScore: calculateAverageQuizScore(applications)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Helper function to calculate average quiz score
const calculateAverageQuizScore = (applications) => {
  const quizScores = applications
    .filter(app => app.quizSubmission?.hasSubmitted)
    .map(app => app.quizSubmission.percentage);
  
  if (quizScores.length === 0) return 0;
  
  const sum = quizScores.reduce((acc, score) => acc + score, 0);
  return Math.round(sum / quizScores.length);
};

module.exports = {
  getAllCandidatesWithStats,
  getCandidateDetailedInfo
};