const Interview = require("../models/interviewModel");
const Application = require("../models/applicationModel");
const Offer = require("../models/offerModel");
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer"); // pour l'envoi de mail


// POST /api/interviews/:applicationId
const scheduleInterview = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) return res.status(403).json({ message: "User not found" });

    const { applicationId } = req.params;
    const { date, meetLink, message } = req.body;

    
    const application = await Application.findById(applicationId).populate("offerId");
    if (!application) return res.status(404).json({ message: "Application not found" });

    // Vérifier que l'utilisateur est le propriétaire de l'offre
    if (application.offerId.companyId.toString() !== user._id.toString()) {
      return res.status(403).json({ message: "Access denied. Only offer owner can schedule interview." });
    }

    // Créer l'entretien
    const interview = new Interview({
      applicationId,
      scheduledBy: user._id,
      date,
      meetLink,
      message,
    });

    await interview.save();

    // Envoyer un email au candidat
    const candidate = await User.findById(application.candidateId);
    if (candidate && candidate.email) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: `"${user.username}" <${process.env.EMAIL_USER}>`,
        to: candidate.email,
        subject: `Interview for your application to ${application.offerId.title}`,
        html: `<p>${message}</p>
               <p>Date: ${new Date(date).toLocaleString()}</p>
               <p>Meet Link: <a href="${meetLink}">${meetLink}</a></p>`,
      });
    }

    res.status(201).json({ message: "Interview scheduled successfully", interview });

  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    res.status(500).json({ message: err.message });
  }
};


module.exports = { scheduleInterview };