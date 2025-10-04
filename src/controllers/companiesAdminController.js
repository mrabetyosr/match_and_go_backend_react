const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const Offer = require("../models/offerModel");
const Quiz = require("../models/quizModel");
const Question = require("../models/questionModel");
const Application = require("../models/applicationModel");

// Helper function to verify admin
const verifyAdmin = async (req) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    throw new Error("No token provided");
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const adminUser = await User.findById(decoded.id);

  if (!adminUser || adminUser.role !== "admin") {
    throw new Error("Only admins can access this info");
  }

  return adminUser;
};

// Get all companies with their stats
const getAllCompaniesWithDetails = async (req, res) => {
  try {
    // Verify admin
    await verifyAdmin(req);

    const { page = 1, limit = 10, category, search } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    let query = { role: "company" };

    if (category) {
      query["companyInfo.category"] = category;
    }

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { "companyInfo.description": { $regex: search, $options: "i" } },
      ];
    }

    // Get companies
    const companies = await User.find(query)
      .select("-password")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    // Get stats for each company
    const companiesWithStats = await Promise.all(
      companies.map(async (company) => {
        const totalOffers = await Offer.countDocuments({ companyId: company._id });
        const activeOffers = await Offer.countDocuments({ 
          companyId: company._id,
          applicationDeadline: { $gte: new Date() }
        });

        return {
          ...company.toObject(),
          stats: {
            totalOffers,
            activeOffers,
          },
        };
      })
    );

    const totalCompanies = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: companiesWithStats,
      pagination: {
        total: totalCompanies,
        page: parseInt(page),
        pages: Math.ceil(totalCompanies / limit),
      },
    });
  } catch (error) {
    console.error("Error in getAllCompaniesWithDetails:", error);
    
    if (error.message === "No token provided") {
      return res.status(401).json({ success: false, message: error.message });
    }
    if (error.message === "Only admins can access this info") {
      return res.status(403).json({ success: false, message: error.message });
    }
    
    res.status(500).json({
      success: false,
      message: "Error fetching companies",
      error: error.message,
    });
  }
};

// Get company details by ID with offers and quizzes
const getCompanyDetailsById = async (req, res) => {
  try {
    // Verify admin
    await verifyAdmin(req);

    const { companyId } = req.params;

    console.log("Fetching company with ID:", companyId);

    // Get company details
    const company = await User.findById(companyId).select("-password");

    if (!company) {
      console.log("Company not found");
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    if (company.role !== "company") {
      console.log("User is not a company, role:", company.role);
      return res.status(400).json({
        success: false,
        message: "User is not a company",
      });
    }

    console.log("Found company:", company.username);

    // Get all offers with their quizzes populated
    const offers = await Offer.find({ companyId: companyId })
      .populate({
        path: "quizzes",
        options: { strictPopulate: false }
      })
      .lean()
      .sort({ createdAt: -1 });

    console.log(`Found ${offers.length} offers for company`);

    // For each offer, get application stats and populate quiz questions
    const offersWithDetails = await Promise.all(
      offers.map(async (offer) => {
        try {
          // Check Application model structure and use appropriate field
          const applicationQueryField = Application.schema.paths.offerId ? 'offerId' : 'offer';
          
          console.log(`Using field '${applicationQueryField}' for applications query`);

          const totalApplications = await Application.countDocuments({
            [applicationQueryField]: offer._id,
          });

          const pendingApplications = await Application.countDocuments({
            [applicationQueryField]: offer._id,
            status: "pending",
          });

          console.log(`Offer ${offer.jobTitle}: ${totalApplications} applications, ${pendingApplications} pending`);

          // Populate questions for each quiz
          let quizzesWithQuestions = [];
          
          if (offer.quizzes && offer.quizzes.length > 0) {
            quizzesWithQuestions = await Promise.all(
              offer.quizzes.map(async (quiz) => {
                try {
                  // If quiz is not populated (just an ID), fetch it
                  const quizData = quiz._id ? quiz : await Quiz.findById(quiz).lean();
                  
                  if (!quizData) {
                    console.log("Quiz not found for ID:", quiz);
                    return null;
                  }

                  const questions = await Question.find({ quiz: quizData._id })
                    .select("questionText choices correctAnswer score questionType order")
                    .lean()
                    .sort({ order: 1 });

                  console.log(`Quiz ${quizData.title}: ${questions.length} questions`);

                  return {
                    ...quizData,
                    questions,
                  };
                } catch (quizError) {
                  console.error("Error fetching quiz details:", quizError);
                  return null;
                }
              })
            );

            // Filter out null values
            quizzesWithQuestions = quizzesWithQuestions.filter(q => q !== null);
          }

          return {
            ...offer,
            quizzes: quizzesWithQuestions,
            stats: {
              totalApplications,
              pendingApplications,
            },
          };
        } catch (offerError) {
          console.error("Error processing offer:", offerError);
          return {
            ...offer,
            quizzes: [],
            stats: {
              totalApplications: 0,
              pendingApplications: 0,
            },
            error: offerError.message
          };
        }
      })
    );

    console.log("Successfully processed all offers");

    res.status(200).json({
      success: true,
      data: {
        company: company.toObject(),
        offers: offersWithDetails,
      },
    });
  } catch (error) {
    console.error("Error in getCompanyDetailsById:", error);
    console.error("Error stack:", error.stack);
    
    if (error.message === "No token provided") {
      return res.status(401).json({ success: false, message: error.message });
    }
    if (error.message === "Only admins can access this info") {
      return res.status(403).json({ success: false, message: error.message });
    }
    
    res.status(500).json({
      success: false,
      message: "Error fetching company details",
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get offer with quizzes
const getOfferWithQuizzes = async (req, res) => {
  try {
    // Verify admin
    await verifyAdmin(req);

    const { offerId } = req.params;

    const offer = await Offer.findById(offerId)
      .populate({
        path: "quizzes",
        options: { strictPopulate: false }
      })
      .lean();

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found",
      });
    }

    // Populate questions for each quiz
    const quizzesWithQuestions = await Promise.all(
      (offer.quizzes || []).map(async (quiz) => {
        const quizData = quiz._id ? quiz : await Quiz.findById(quiz).lean();
        
        if (!quizData) return null;

        const questions = await Question.find({ quiz: quizData._id })
          .select("questionText choices correctAnswer score questionType order")
          .lean()
          .sort({ order: 1 });

        return {
          ...quizData,
          questions,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        ...offer,
        quizzes: quizzesWithQuestions.filter(q => q !== null),
      },
    });
  } catch (error) {
    console.error("Error in getOfferWithQuizzes:", error);
    
    if (error.message === "No token provided") {
      return res.status(401).json({ success: false, message: error.message });
    }
    if (error.message === "Only admins can access this info") {
      return res.status(403).json({ success: false, message: error.message });
    }
    
    res.status(500).json({
      success: false,
      message: "Error fetching offer details",
      error: error.message,
    });
  }
};

// Get quiz details with questions
const getQuizDetails = async (req, res) => {
  try {
    // Verify admin
    await verifyAdmin(req);

    const { quizId } = req.params;

    const quiz = await Quiz.findById(quizId)
      .populate("offer", "jobTitle")
      .lean();

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found",
      });
    }

    const questions = await Question.find({ quiz: quizId })
      .select("questionText choices correctAnswer score questionType order")
      .lean()
      .sort({ order: 1 });

    res.status(200).json({
      success: true,
      data: {
        ...quiz,
        questions,
      },
    });
  } catch (error) {
    console.error("Error in getQuizDetails:", error);
    
    if (error.message === "No token provided") {
      return res.status(401).json({ success: false, message: error.message });
    }
    if (error.message === "Only admins can access this info") {
      return res.status(403).json({ success: false, message: error.message });
    }
    
    res.status(500).json({
      success: false,
      message: "Error fetching quiz details",
      error: error.message,
    });
  }
};

module.exports = {
  getAllCompaniesWithDetails,
  getCompanyDetailsById,
  getOfferWithQuizzes,
  getQuizDetails,
};