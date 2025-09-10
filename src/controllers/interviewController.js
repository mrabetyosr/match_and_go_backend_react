const Interview = require("../models/interviewModel");
const Application = require("../models/applicationModel");
const User = require("../models/userModel");
const Notification = require("../models/notificationModel");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const { sendNotification } = require("../utils/socket");

// Helper function: notify candidate
const notifyCandidate = async (candidateId, message) => {
  const notif = await Notification.create({ candidateId, message });
  sendNotification(candidateId, message);
  return notif;
};

// Main function
const scheduleInterview = async (req, res) => {
  try {
    // ✅ Verify token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(403).json({ message: "User not found" });

    const { applicationId } = req.params;
    const { date } = req.body;

    // ✅ Fetch application
    const application = await Application.findById(applicationId).populate("offerId");
    if (!application) return res.status(404).json({ message: "Application not found" });

    // ✅ Check company ownership
    if (application.offerId.companyId.toString() !== user._id.toString()) {
      return res.status(403).json({ message: "Only the offer owner can schedule the interview" });
    }

    // ✅ Fetch candidate
    const candidate = await User.findById(application.candidateId);
    if (!candidate) return res.status(404).json({ message: "Candidate not found" });

    // ✅ Generate Jitsi Meet link
    const roomName = `matchgo-${uuidv4()}`;
    const meetLink = `https://meet.jit.si/${roomName}`;

    const messageText = `
Hello ${candidate.username},

You are invited to an interview for the position of "${application.offerId.jobTitle}".

Date & Time: ${new Date(date).toLocaleString()}
Meeting Link: ${meetLink}

Best regards,
${user.username}
`.trim();

    // ✅ Save interview
    const interview = new Interview({
      applicationId,
      scheduledBy: user._id,
      date,
      meetLink,
      message: messageText,
    });
    await interview.save();

    // ✅ Send email
    if (candidate?.email) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      });

      const logoPath = path.join(__dirname, "../assets/namelogo.png");

      const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Interview Scheduled</title></head>
<body>
  <h2>Hello ${candidate.username},</h2>
  <p>You have an interview for <strong>${application.offerId.jobTitle}</strong>.</p>
  <p>Date & Time: ${new Date(date).toLocaleString()}</p>
  <p>Meeting Link: <a href="${meetLink}">${meetLink}</a></p>
  <p>Best regards,<br>${user.username}</p>
</body>
</html>
`;

      await transporter.sendMail({
        from: `"${user.username}" <${process.env.EMAIL_USER}>`,
        to: candidate.email,
        subject: `Interview Scheduled: ${application.offerId.jobTitle}`,
        html: emailHtml,
        attachments: [{ filename: "namelogo.png", path: logoPath, cid: "namelogo" }],
      });
    }

    // ✅ Send notification
    await notifyCandidate(
      candidate._id,
      `You have a new interview for "${application.offerId.jobTitle}" on ${new Date(date).toLocaleString()}. Join here: ${meetLink}`
    );

    res.status(201).json({ message: "Interview scheduled successfully", interview });
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError")
      return res.status(401).json({ message: "Invalid or expired token" });
    res.status(500).json({ message: err.message });
  }
};




////////////////// Récupérer tous les entretiens pour une offre (owner seulement)
const getInterviewsByOffer = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(403).json({ message: "User not found" });

    if (user.role !== "company") return res.status(403).json({ message: "Access denied. Only companies." });

    const { offerId } = req.params;

    const interviews = await Interview.find()
      .populate({
        path: "applicationId",
        match: { offerId },
        populate: { path: "candidateId", select: "username email" }
      })
      .populate("scheduledBy", "username email");

    // Filtrer les interviews null (si aucune application ne correspond)
    const filtered = interviews.filter(i => i.applicationId);

    res.status(200).json(filtered);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


/// Récupérer tous les entretiens pour le candidat connecté
const getMyInterviews = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(403).json({ message: "User not found" });

    const interviews = await Interview.find({ applicationId: { $in: await Application.find({ candidateId: user._id }).select("_id") } })
      .populate("applicationId", "offerId")
      .populate("scheduledBy", "username email");

    res.status(200).json(interviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/////////recherche d'entretiens par date pour company et candidat
const getInterviewsByDate = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(403).json({ message: "User not found" });

    const { from, to, offerId } = req.query;
    if (!from || !to) return res.status(400).json({ message: "from and to dates required" });

    const filter = { date: { $gte: new Date(from), $lte: new Date(to) } };

    if (user.role === "candidate") {
      const apps = await Application.find({ candidateId: user._id }).select("_id");
      filter.applicationId = { $in: apps };
    } else if (user.role === "company" && offerId) {
      const apps = await Application.find({ offerId }).select("_id");
      filter.applicationId = { $in: apps };
    }

    const interviews = await Interview.find(filter)
      .populate("applicationId", "candidateId offerId")
      .populate("scheduledBy", "username email");

    res.status(200).json(interviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



module.exports = { scheduleInterview,getInterviewsByOffer,getMyInterviews,getInterviewsByDate}
