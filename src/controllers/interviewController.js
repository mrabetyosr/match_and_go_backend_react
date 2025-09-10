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

const scheduleInterview = async (req, res) => {
  try {
    // Verify token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(403).json({ message: "User not found" });

    const { applicationId } = req.params;
    const { date } = req.body;

    const application = await Application.findById(applicationId).populate("offerId");
    if (!application) return res.status(404).json({ message: "Application not found" });

    if (application.offerId.companyId.toString() !== user._id.toString())
      return res.status(403).json({ message: "Only the offer owner can schedule the interview" });

    const candidate = await User.findById(application.candidateId);
    if (!candidate) return res.status(404).json({ message: "Candidate not found" });

    // Generate Jitsi Meet link
    const roomName = `matchgo-${uuidv4()}`;
    const meetLink = `https://meet.jit.si/${roomName}`;

    // Automatically generate message
    const message = `
Hello ${candidate.username},

You are invited to an interview for the position of "${application.offerId.jobTitle}".
Date & Time: ${new Date(date).toLocaleString()}
Meeting Link: ${meetLink}

We look forward to meeting you.
Best regards,
${user.username}
`.trim();

    // Save interview to database
    const interview = new Interview({
      applicationId,
      scheduledBy: user._id,
      date,
      meetLink,
      message,
    });
    await interview.save();

    // Send email to candidate
    if (candidate?.email) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      });

      const logoPath = path.join(__dirname, "../assets/namelogo.png");

      const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Interview Scheduled - Match & Go</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f8; font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table width="100%" style="padding:40px 0;">
    <tr>
      <td align="center">
        <table width="650" style="background:#fff;border-radius:12px;overflow:hidden; box-shadow:0 8px 20px rgba(0,0,0,0.12);">
          <tr>
            <td style="background:linear-gradient(135deg,#28a745 0%,#20c997 100%); color:#fff; text-align:center; padding:35px 30px;">
              <img src="cid:namelogo" alt="Company Logo" style="width:120px; height:auto; margin-bottom:20px; border-radius:10px;">
              <h1 style="margin:0; font-size:28px; font-weight:700;">🎯 Interview Scheduled</h1>
              <p style="margin:8px 0 0 0; font-size:16px; opacity:0.95;">Hello ${candidate.username}, your interview is ready!</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 35px; color:#2c3e50; font-size:16px; line-height:1.7;">
              <p style="margin:0 0 25px 0;">Your application for <strong>${application.offerId.jobTitle}</strong> has been selected for an interview.</p>
              <table width="100%" style="margin:25px 0;text-align:center;">
                <tr>
                  <td>
                    <a href="${meetLink}" style="display:inline-block;padding:16px 32px;background:linear-gradient(135deg,#28a745 0%,#20c997 100%);color:#fff;border-radius:10px;text-decoration:none;font-weight:600;">
                      🚀 Join the Interview
                    </a>
                  </td>
                </tr>
              </table>
              <table width="100%" style="background-color:#f8f9fa; border-radius:10px; border-left:4px solid #28a745; margin:25px 0; padding:25px;">
                <tr>
                  <td>
                    <h3 style="margin:0 0 15px 0; color:#28a745; font-size:18px; font-weight:600;">📋 Interview Details</h3>
                    <p style="margin:5px 0;">🔗 Link: <a href="${meetLink}" style="color:#28a745; text-decoration:none;">${meetLink}</a></p>
                    <p style="margin:5px 0;">📅 Date: ${new Date(date).toLocaleString()}</p>
                    <p style="margin:5px 0;">💼 Position: ${application.offerId.jobTitle}</p>
                    <p style="margin:5px 0;">🏢 Company: ${user.username}</p>
                  </td>
                </tr>
              </table>
              <table width="100%" style="background-color:#e8f5e8; border-radius:8px; margin:25px 0; padding:20px;">
                <tr>
                  <td>
                    <h4 style="margin:0 0 10px 0; color:#28a745; font-size:16px; font-weight:600;">💬 Message from the Team</h4>
                    <p style="margin:0; color:#495057;">${message}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8f9fa; text-align:center; padding:25px 30px; border-top:1px solid #e9ecef;">
              <p style="margin:0 0 8px 0; font-size:14px; color:#6c757d;">© ${new Date().getFullYear()} Match & Go. All rights reserved.</p>
              <p style="margin:0; font-size:13px; color:#868e96;">Questions? Contact us: <a href="mailto:support@matchandgo.com" style="color:#28a745; text-decoration:none;">support@matchandgo.com</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      await transporter.sendMail({
        from: `"${user.username}" <${process.env.EMAIL_USER}>`,
        to: candidate.email,
        subject: `Interview Scheduled for "${application.offerId.jobTitle}"`,
        html: emailHtml,
        attachments: [{ filename: "namelogo.png", path: logoPath, cid: "namelogo" }],
      });
    }

    // Send notification
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
