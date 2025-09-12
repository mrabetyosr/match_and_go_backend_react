const express = require("express");
const{register,login,getCurrentUser,forgotPassword,resetPassword,verifyCode} = require("../controllers/authController");
const verifyToken = require("../middleware/authMiddleware");
const bcrypt = require("bcrypt");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", verifyToken, getCurrentUser); 


router.post("/forgot-password", forgotPassword);      // send code to email
router.post("/verify-code", verifyCode);              // verify the code
router.post("/reset-password", resetPassword);        // reset password
module.exports = router;