const Interview = require("../models/interviewModel")
const Application = require("../models/applicationModel")
const Offer = require("../models/offerModel")
const User = require("../models/userModel")
const jwt = require("jsonwebtoken")
const nodemailer = require("nodemailer")
const path = require("path")

const scheduleInterview = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]
    if (!token) return res.status(401).json({ message: "No token provided" })

    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id)
    if (!user) return res.status(403).json({ message: "User not found" })

    const { applicationId } = req.params
    const { date, meetLink, message } = req.body

    const application = await Application.findById(applicationId).populate("offerId")
    if (!application) return res.status(404).json({ message: "Application not found" })

    
    if (application.offerId.companyId.toString() !== user._id.toString()) {
      return res.status(403).json({ message: "Access denied. Only offer owner can schedule interview." })
    }

    const interview = new Interview({
      applicationId,
      scheduledBy: user._id,
      date,
      meetLink,
      message,
    })
    await interview.save()

    // Envoyer l'email au candidat
    const candidate = await User.findById(application.candidateId)
    if (candidate && candidate.email) {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      })

      // chemin vers ton logo
      const logoPath = path.join(__dirname, "../assets/namelogo.png")

      // HTML avec cid
      const emailHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Interview Scheduled - Match&Go</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            
            <!-- Header avec gradient vert et noir -->
            <div style="background: linear-gradient(135deg, #1f2937 0%, #374151 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <img src="cid:namelogo" alt="Match&Go Logo" style="width: 140px; margin-bottom: 20px; filter: brightness(0) invert(1);"/>
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                🎉 Congratulations!
              </h1>
              <p style="color: #d1d5db; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">
                You have been selected for an interview
              </p>
            </div>

            <!-- Contenu principal -->
            <div style="padding: 40px 30px;">
              <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin-bottom: 30px; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6;">
                  Hello <strong style="color: #1f2937;">${candidate.username}</strong>,
                </p>
                <p style="margin: 15px 0 0 0; color: #374151; font-size: 16px; line-height: 1.6;">
                  We are pleased to inform you that your application for the position of 
                  <strong style="color: #10b981; background-color: #f0fdf4; padding: 2px 8px; border-radius: 4px;">${application.offerId.jobTitle}</strong> 
                  has caught our attention.
                </p>
              </div>

              <!-- Détails de l'entretien -->
              <div style="background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); border-radius: 12px; padding: 25px; margin-bottom: 30px; border: 2px solid #10b981;">
                <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 20px; display: flex; align-items: center;">
                  📅 Interview Details
                </h2>
                
                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                  <div style="background-color: #10b981; width: 4px; height: 40px; margin-right: 15px; border-radius: 2px;"></div>
                  <div>
                    <p style="margin: 0; color: #6b7280; font-weight: 600; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Date & Time</p>
                    <p style="margin: 5px 0 0 0; color: #1f2937; font-size: 18px; font-weight: 500;">${new Date(
                      date,
                    ).toLocaleString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}</p>
                  </div>
                </div>

                <div style="text-align: center; margin-top: 25px;">
                  <a href="${meetLink}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3); transition: all 0.3s ease;">
                    🎥 Join Google Meet Interview
                  </a>
                </div>
              </div>

              <!-- Message personnalisé -->
              ${
                message
                  ? `
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 30px; border: 1px solid #d1d5db;">
                <h3 style="color: #374151; margin: 0 0 15px 0; font-size: 16px; display: flex; align-items: center;">
                  💬 Message from the team
                </h3>
                <p style="margin: 0; color: #4b5563; font-size: 15px; line-height: 1.6; font-style: italic;">
                  "${message}"
                </p>
              </div>
              `
                  : ""
              }

              <!-- Conseils -->
              <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 8px; padding: 20px; margin-bottom: 30px; border: 1px solid #10b981;">
                <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 16px;">💡 Interview Tips</h3>
                <ul style="margin: 0; padding-left: 20px; color: #166534;">
                  <li style="margin-bottom: 8px;">Test your internet connection and camera</li>
                  <li style="margin-bottom: 8px;">Prepare questions about the company and position</li>
                  <li style="margin-bottom: 8px;">Have your resume ready</li>
                  <li>Join 5 minutes before the scheduled time</li>
                </ul>
              </div>
            </div>

            <!-- Footer -->
            <div style="background-color: #1f2937; padding: 30px; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="margin: 0 0 10px 0; color: #9ca3af; font-size: 14px;">
                Good luck with your interview!
              </p>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                The <strong style="color: #10b981;">Match&Go</strong> Team
              </p>
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #374151;">
                <p style="margin: 0; color: #6b7280; font-size: 12px;">
                  © 2024 Match&Go. All rights reserved.
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `

      await transporter.sendMail({
        from: `"${user.username}" <${process.env.EMAIL_USER}>`,
        to: candidate.email,
        subject: `Interview Scheduled for "${application.offerId.jobTitle}"`,
        html: emailHtml,
        attachments: [
          {
            filename: "namelogo.png",
            path: logoPath,
            cid: "namelogo", 
          },
        ],
      })
    }

    res.status(201).json({ message: "Interview scheduled successfully", interview })
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Invalid or expired token" })
    }
    res.status(500).json({ message: err.message })
  }
}


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


module.exports = { scheduleInterview,getInterviewsByOffer}
