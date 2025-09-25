const Application = require("../models/applicationModel");
const Offer = require("../models/offerModel");
const User = require("../models/userModel");
const QuizAnswer = require("../models/quizAnswer");
const jwt = require("jsonwebtoken");

const applyToOffer = async (req, res) => {
  try {
   
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.role !== "candidate") {
      return res.status(403).json({ message: "Only candidates can apply." });
    }

    
    const offerId = req.params.offerId;
    const offer = await Offer.findById(offerId);
    if (!offer) return res.status(404).json({ message: "Offer not found" });

    if (offer.applicationDeadline && offer.applicationDeadline < new Date()) {
      return res.status(400).json({ message: "The offer is already closed." });
    }

   
    const existingApp = await Application.findOne({
      candidateId: user._id,
      offerId: offer._id,
    });
    if (existingApp) {
      return res.status(400).json({ message: "You have already applied to this offer." });
    }

   
    if (!req.files || !req.files.cv || !req.files.motivationLetter) {
      return res.status(400).json({ message: "CV and Motivation Letter are required" });
    }

    const cvPath = req.files.cv[0].filename;
    const motivationLetterPath = req.files.motivationLetter[0].filename;

    
    const application = new Application({
      candidateId: user._id,
      offerId: offer._id,
      cv: cvPath,
      motivationLetter: motivationLetterPath,
      linkedin: req.body.linkedin || null,
      github: req.body.github || null,
      phoneNumber: req.body.phoneNumber || null,
      location: req.body.location || null,
      dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : null,
      email: user.email,
    });

    await application.save();

    res.status(201).json({ message: "Application submitted successfully", application });
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    res.status(500).json({ message: err.message });
  }
};

// GET all my applications candidate 
const getMyApplications = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.role !== "candidate") {
      return res.status(403).json({ message: "Only candidates can view their applications." });
    }

    const applications = await Application.find({ candidateId: user._id })
      .populate({
        path: "offerId",
        select: "jobTitle description applicationDeadline companyId",
        populate: {
          path: "companyId",
          select: "username image_User companyInfo.location companyInfo.description",
        },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ applications });
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    res.status(500).json({ message: err.message });
  }
};

// GET all submissions for an offer (only owner of the offer)
const getOfferSubmissions = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) return res.status(403).json({ message: "User not found" });

    const offerId = req.params.offerId;

    
    const offer = await Offer.findById(offerId);
    if (!offer) return res.status(404).json({ message: "Offer not found" });

    if (offer.companyId.toString() !== user._id.toString()) {
      return res.status(403).json({ message: "Access denied. Only the offer owner can see submissions." });
    }

    // Get all applications for this offer
    const applications = await Application.find({ offerId: offer._id })
      .populate("candidateId", "username email dateOfBirth phoneNumber location")
      .sort({ createdAt: -1 });

    // For each application, check if the candidate has submitted a quiz for this offer
    const applicationsWithQuizData = await Promise.all(
      applications.map(async (application) => {
        try {
          // Find quiz submissions for this candidate and this offer
          const quizSubmissions = await QuizAnswer.find({
            candidate: application.candidateId._id,
          })
          .populate({
            path: "quiz",
            select: "title totalScore offer",
            match: { offer: offerId }, // Only get quizzes for this specific offer
          })
          .sort({ createdAt: -1 });

          // Filter out null quiz results (where offer doesn't match)
          const validQuizSubmissions = quizSubmissions.filter(submission => submission.quiz !== null);

          let quizSubmission = {
            hasSubmitted: false,
            submissionId: null,
            score: null,
            totalPossibleScore: null,
            percentage: null,
            quizTitle: null,
            submittedAt: null
          };

          if (validQuizSubmissions.length > 0) {
            const latestQuizSubmission = validQuizSubmissions[0];
            quizSubmission = {
              hasSubmitted: true,
              submissionId: latestQuizSubmission._id,
              score: latestQuizSubmission.score,
              totalPossibleScore: latestQuizSubmission.totalScore,
              percentage: latestQuizSubmission.percentage,
              quizTitle: latestQuizSubmission.quiz.title,
              submittedAt: latestQuizSubmission.createdAt
            };
          }

          // Return application with quiz data
          return {
            ...application.toObject(),
            quizSubmission
          };
        } catch (error) {
          console.error(`Error processing quiz data for application ${application._id}:`, error);
          // Return application with default quiz submission data if error occurs
          return {
            ...application.toObject(),
            quizSubmission: {
              hasSubmitted: false,
              submissionId: null,
              score: null,
              totalPossibleScore: null,
              percentage: null,
              quizTitle: null,
              submittedAt: null
            }
          };
        }
      })
    );

    res.status(200).json({ applications: applicationsWithQuizData });

  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    console.error("Error in getOfferSubmissions:", err);
    res.status(500).json({ message: err.message });
  }
};

// UPDATE application status (only by company who owns the offer)
const updateApplicationStatus = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.role !== "company") {
      return res.status(403).json({ message: "Only companies can update application status." });
    }

    const applicationId = req.params.applicationId;
    const { status } = req.body;

    // Validate status
    if (!["interview_scheduled", "accepted", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const application = await Application.findById(applicationId).populate("offerId");
    if (!application) return res.status(404).json({ message: "Application not found" });

    if (application.offerId.companyId.toString() !== user._id.toString()) {
      return res.status(403).json({ message: "Access denied. You can only update applications for your own offers." });
    }

    // Status transition logic
    const currentStatus = application.status;

    if (currentStatus === "pending") {
      if (!["interview_scheduled", "rejected"].includes(status)) {
        return res.status(400).json({ message: "From pending, you can only schedule interview or reject." });
      }
    } else if (currentStatus === "interview_scheduled") {
      if (!["accepted", "rejected"].includes(status)) {
        return res.status(400).json({ message: "After interview scheduled, you can only accept or reject." });
      }
    } else if (["accepted", "rejected"].includes(currentStatus)) {
      return res.status(400).json({ message: `Cannot change status from ${currentStatus}. This is a final decision.` });
    }

    application.status = status;
    await application.save();

    // Return populated application so candidate sees changes
    await application.populate({
      path: "offerId",
      populate: { path: "companyId", select: "username image_User companyInfo" },
    });

    res.status(200).json({ message: `Status updated to ${status} successfully`, application });
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    res.status(500).json({ message: err.message });
  }
};

const deleteApplicationsForOffer = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.role !== "company") {
      return res.status(403).json({ message: "Only companies can delete applications." });
    }

    const { offerId } = req.params;
    const offer = await Offer.findById(offerId);
    if (!offer) return res.status(404).json({ message: "Offer not found" });

    if (offer.companyId.toString() !== user._id.toString()) {
      return res.status(403).json({ message: "You are not allowed to delete applications for this offer." });
    }

    const deleted = await Application.deleteMany({ offerId: offer._id });

    res.status(200).json({ message: `${deleted.deletedCount} applications deleted successfully` });
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    res.status(500).json({ message: err.message });
  }
};

module.exports = { deleteApplicationsForOffer, applyToOffer, getMyApplications, getOfferSubmissions, updateApplicationStatus };