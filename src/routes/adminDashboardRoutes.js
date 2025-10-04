const express = require("express");
const router = express.Router();
const { 
  countCandidates,
  countCompanies,
  getOfferCount,
  getPostCount,
  getOffersStatsPerDay,
  getPostsStatsPerDay,
  getOffersWithApplicants,
  getScheduledMeetings 
} = require("../controllers/adminDashboardController");

// Comptages
router.get("/admin/candidates-count", countCandidates);
router.get("/admin/companies-count", countCompanies);
router.get("/admin/offers-count", getOfferCount);
router.get("/admin/posts-count", getPostCount);



router.get("/stats-per-day", getOffersStatsPerDay);
router.get("/posts-per-day", getPostsStatsPerDay);
router.get("/offers-with-applicants", getOffersWithApplicants);
router.get("/meetings", getScheduledMeetings);

const { 
  getAllCompaniesWithDetails,
  getCompanyDetailsById,
  getOfferWithQuizzes,
  getQuizDetails
} = require("../controllers/companiesAdminController");

router.get("/admin/companies", getAllCompaniesWithDetails);
router.get("/admin/companies/:companyId", getCompanyDetailsById);
router.get("/admin/offers/:offerId", getOfferWithQuizzes);
router.get("/admin/quizzes/:quizId", getQuizDetails);

const { 
  getAllCandidatesWithStats,
  getCandidateDetailedInfo
} = require("../controllers/candidateDetailsController");

router.get("/admin/candidates/stats", getAllCandidatesWithStats);
router.get("/admin/candidates/:candidateId/details", getCandidateDetailedInfo);

module.exports = router;
