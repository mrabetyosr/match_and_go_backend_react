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

module.exports = router;
