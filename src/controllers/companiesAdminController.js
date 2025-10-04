// controllers/companiesAdminController.js
const User = require("../models/userModel");
const Offer = require("../models/offerModel");
const Application = require("../models/applicationModel");
const Quiz = require("../models/quizModel");



// Get all companies with their offers and quizzes
exports.getAllCompaniesWithDetails = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, search } = req.query;
    const skip = (page - 1) * limit;

    // Build filter
    let filter = { role: "company" };
    
    if (category) {
      filter["companyInfo.category"] = category;
    }
    
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { "companyInfo.description": { $regex: search, $options: "i" } }
      ];
    }

    // Get companies
    const companies = await User.find(filter)
      .select("-password -resetPasswordToken -resetPasswordExpire")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    // Get total count for pagination
    const total = await User.countDocuments(filter);

    // For each company, get their offers count
    const companiesWithStats = await Promise.all(
      companies.map(async (company) => {
        const offersCount = await Offer.countDocuments({ companyId: company._id });
        const activeOffers = await Offer.countDocuments({ 
          companyId: company._id,
          applicationDeadline: { $gte: new Date() }
        });
        
        return {
          ...company.toObject(),
          stats: {
            totalOffers: offersCount,
            activeOffers: activeOffers
          }
        };
      })
    );

    res.status(200).json({
      success: true,
      data: companiesWithStats,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching companies:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching companies",
      error: error.message
    });
  }
};

// Get single company with all offers and quizzes details
exports.getCompanyDetailsById = async (req, res) => {
  try {
    const { companyId } = req.params;

    // Get company info
    const company = await User.findById(companyId)
      .select("-password -resetPasswordToken -resetPasswordExpire");

    if (!company || company.role !== "company") {
      return res.status(404).json({
        success: false,
        message: "Company not found"
      });
    }

    // Get all offers of this company with populated quizzes
    const offers = await Offer.find({ companyId })
      .populate({
        path: "quizzes",
        select: "title description timeLimit passingScore isPublished questionCount"
      })
      .sort({ createdAt: -1 });

    // Get applications count for each offer
    const offersWithStats = await Promise.all(
      offers.map(async (offer) => {
        const applicationsCount = await Application.countDocuments({ 
          offerId: offer._id 
        });
        const pendingApplications = await Application.countDocuments({ 
          offerId: offer._id,
          status: "pending"
        });
        
        return {
          ...offer.toObject(),
          stats: {
            totalApplications: applicationsCount,
            pendingApplications: pendingApplications
          }
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        company: company.toObject(),
        offers: offersWithStats,
        totalOffers: offers.length
      }
    });
  } catch (error) {
    console.error("Error fetching company details:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching company details",
      error: error.message
    });
  }
};

// Get offer with all quizzes details
exports.getOfferWithQuizzes = async (req, res) => {
  try {
    const { offerId } = req.params;

    const offer = await Offer.findById(offerId)
      .populate("companyId", "username email image_User companyInfo")
      .populate({
        path: "quizzes",
        select: "title description timeLimit passingScore isPublished questions"
      });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found"
      });
    }

    // Get applications count
    const applicationsCount = await Application.countDocuments({ offerId });

    res.status(200).json({
      success: true,
      data: {
        ...offer.toObject(),
        stats: {
          totalApplications: applicationsCount
        }
      }
    });
  } catch (error) {
    console.error("Error fetching offer:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching offer",
      error: error.message
    });
  }
};

// Get quiz details with questions
exports.getQuizDetails = async (req, res) => {
  try {
    const { quizId } = req.params;

    const quiz = await Quiz.findById(quizId)
      .populate({
        path: "questions",
        select: "questionText choices correctAnswer points"
      });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found"
      });
    }

    res.status(200).json({
      success: true,
      data: quiz
    });
  } catch (error) {
    console.error("Error fetching quiz:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching quiz",
      error: error.message
    });
  }
};