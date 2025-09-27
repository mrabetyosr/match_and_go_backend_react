const express = require("express");
const {
  register,
  login,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  verifyCode,
  completeRegistration,
  checkPaymentStatus,
  migrateOldCompanyToStripe,
  cleanupExpiredSessions,
  completeRegistrationForExistingCompany,
  deleteStripeAccount,
  upgradePlanWithoutProtect,
  checkSubscriptionStatus,
  getPlans // ✅ NOUVEAU : Import de la fonction getPlans
} = require("../controllers/authController");
const verifyToken = require("../middleware/authMiddleware");
const bcrypt = require("bcrypt");

const router = express.Router();

// ============================================
// ROUTES D'AUTHENTIFICATION PRINCIPALES
// ============================================

router.post("/register", register);
router.post("/login", login);
router.get("/me", verifyToken, getCurrentUser);

// ============================================
// ROUTES POUR LES PLANS DE PAIEMENT
// ============================================
router.get("/subscription/:userId", verifyToken, checkSubscriptionStatus);

// ✅ NOUVEAU : Route pour récupérer les plans disponibles
router.get("/plans", getPlans);

// ============================================
// ROUTES DE PAIEMENT ET INSCRIPTION COMPANY
// ============================================
router.post("/upgrade", upgradePlanWithoutProtect);

// Route pour vérifier le paiement et créer l'utilisateur company
router.post('/complete-registration', completeRegistration);

// Route pour vérifier le statut d'un paiement
router.get("/payment-status/:sessionId", checkPaymentStatus);

// Route admin pour nettoyer les sessions expirées (optionnel)
router.post("/admin/cleanup-sessions", verifyToken, cleanupExpiredSessions);


// ============================================
// ROUTES DE RÉCUPÉRATION DE MOT DE PASSE
// ============================================
router.post(
  "/migrate-old-company",
      // Vérifie que c'est un admin
  migrateOldCompanyToStripe
);

router.delete("/delete-stripe-account",  deleteStripeAccount);

router.post("/forgot-password", forgotPassword);      // send code to email
router.post("/verify-code", verifyCode);              // verify the code
router.post("/reset-password", resetPassword);        // reset password

router.post("/complete-existing-company", async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ message: "Session ID is required" });

    const company = await completeRegistrationForExistingCompany(sessionId);

    res.status(200).json({
      message: `Company ${company.username} activated successfully`,
      company: {
        id: company._id,
        username: company.username,
        email: company.email,
        plan: company.planInfo,
        isActive: company.isActive
      }
    });
  } catch (error) {
    console.error("Error completing existing company registration:", error);
    res.status(500).json({ message: error.message || "Something went wrong" });
  }
});
module.exports = router;