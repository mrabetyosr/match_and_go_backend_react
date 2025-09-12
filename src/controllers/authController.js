const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const path = require("path");

const register = async (req, res) => {
  try {
    const { username, email, password, role, location, category, founded, size, website, linkedin } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role: role || "candidate",
    });

    // 🔥 Si c'est une entreprise, on ajoute les infos spécifiques
    if (role === "company") {
      newUser.companyInfo = {
        location,
        category,
        founded,
        size,
        website,
        linkedin
      };
    }

    await newUser.save();

    res.status(201).json({ 
      message: `User registered with username ${username}`, 
      role: newUser.role 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "something went wrong" });
  }
};






const login = async (req, res) => {
   try { 
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
        return res.status(404).json({message: `User with username ${email} not found`})
    } 

    const isMatch = await bcrypt.compare(password, user.password)
    if(!isMatch){
        return res.status(400).json({message : `Invalid credentails`})
    }

    const token = jwt.sign({id: user._id, role: user.role},process.env.JWT_SECRET,{ expiresIn: "1h" });
    
    res.status(200).json({ token })
}
    catch (err) {
        res.status(500).json({message:`Something went wrong`})
    }
};

// current user
const getCurrentUser = async (req, res) => {
    try {
        // req.user est défini par le middleware verifyToken
        const user = await User.findById(req.user.id).select("username image_User email role");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Something went wrong" });
    }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found with this email" });

    // Générer le code à 6 chiffres
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Hasher le code avant de sauvegarder
    const resetCodeHash = crypto.createHash("sha256").update(resetCode).digest("hex");

    // Sauvegarder le code + date d'expiration
    user.resetPasswordToken = resetCodeHash;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
    await user.save();

    // Logo depuis le dossier assets
    const logoPath = path.join(__dirname, "..", "assets", "namelogo.png");

    // Configurer nodemailer
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Envoyer l'email HTML professionnel
    await transporter.sendMail({
      from: `"Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset Code",
      attachments: [
        {
          filename: "namelogo.png",
          path: logoPath,
          cid: "logo",
        },
      ],
      html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f8; padding: 30px;">
        <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          
          <!-- Header with Logo -->
          <div style="background-color: #28a7465b; padding: 30px; text-align: center;">
            <img src="cid:logo" alt="Logo" style="height: 200px; width: auto;"/>
          </div>

          <!-- Main Content -->
          <div style="padding: 40px; text-align: center;">
            <h1 style="color: #28a745; font-size: 28px; margin-bottom: 20px;">Password Reset Request</h1>
            <p style="color: #555; font-size: 16px;">We received a request to reset your password. Use the code below to proceed.</p>
            
            <div style="margin: 30px 0; font-size: 32px; font-weight: bold; color: #28a745; letter-spacing: 4px;">
              ${resetCode}
            </div>

            <p style="color: #555; font-size: 14px;">This code will expire in <strong>15 minutes</strong>.</p>

            <a href="#" style="display: inline-block; margin-top: 25px; background: linear-gradient(90deg, #28a745, #218838); color: white; text-decoration: none; font-weight: bold; padding: 15px 35px; border-radius: 8px; transition: all 0.3s;">Reset Password</a>
          </div>

          <!-- Footer -->
          <div style="background-color: #f1f1f1; padding: 20px; text-align: center; font-size: 12px; color: #777;">
            <p>If you did not request a password reset, please ignore this email.</p>
            <p>&copy; ${new Date().getFullYear()} MatchGo. All rights reserved.</p>
          </div>

        </div>
      </div>
      `,
    });

    res.status(200).json({ message: "Reset code sent to email" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong" });
  }
};

// 📌 Verify Reset Code
const verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    const resetCodeHash = crypto.createHash("sha256").update(code).digest("hex");

    const user = await User.findOne({
      email,
      resetPasswordToken: resetCodeHash,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired code" });

    res.status(200).json({ message: "Code verified" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong" });
  }
};

// 📌 Reset Password (After Code Verification)
const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    // Hash the code
    const resetCodeHash = crypto.createHash("sha256").update(code).digest("hex");

    const user = await User.findOne({
      email,
      resetPasswordToken: resetCodeHash,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired code" });

    // Hash and save new password
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong" });
  }
};


module.exports = {
  register,
  login,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  verifyCode
};
