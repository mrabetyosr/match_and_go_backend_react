const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const User = require("../models/userModel"); // Assure-toi que le chemin est correct

exports.scheduleMeet = async (req, res) => {
    try {
        // 1️⃣ Récupérer le token depuis les headers
        const token = req.headers.authorization?.split(" ")[1];
        if (!token)
            return res.status(401).json({ message: "Access denied. No token provided." });

        // 2️⃣ Vérifier le token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const connectedUser = await User.findById(decoded.id);

        // 3️⃣ Vérifier que l'utilisateur est une entreprise
        if (!connectedUser || connectedUser.role !== "company") {
            return res.status(403).json({ message: "Only companies can schedule meetings." });
        }

        // 4️⃣ Vérifier les champs du body
        const { email, startDate, endDate } = req.body;
        if (!email || !startDate || !endDate) {
            return res.status(400).json({ message: "Tous les champs sont obligatoires" });
        }

        // 5️⃣ Générer un lien Jitsi Meet
        const meetRoom = `meet-${uuidv4()}`;
        const meetLink = `https://meet.jit.si/${meetRoom}`;

        // 6️⃣ Configurer nodemailer
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
        });

        const mailOptions = {
            from: `"Match & Go" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "📅 Meeting Invitation - Match & Go",
            html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meeting Invitation - Match & Go</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  
  <!-- Main container -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f4f6f8; padding: 40px 0;">
    <tr>
      <td align="center">
        
        <!-- Email wrapper -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="650" style="max-width: 650px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 20px rgba(0,0,0,0.12);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: #ffffff; text-align: center; padding: 35px 30px;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Match & Go</h1>
              <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.95;">Your recruitment partner</p>
            </td>
          </tr>
          
          <!-- Body -->
          <tr>
            <td style="padding: 40px 35px; color: #2c3e50; font-size: 16px; line-height: 1.7;">
              
              <!-- Greeting -->
              <h2 style="color: #28a745; font-size: 22px; margin: 0 0 20px 0; font-weight: 600;">
                🎯 Meeting Invitation
              </h2>
              
              <p style="margin: 0 0 20px 0;">Hello,</p>
              
              <p style="margin: 0 0 25px 0;">
                We are pleased to invite you to a virtual meeting with our <strong>Match & Go</strong> team. 
                This session will be an opportunity to discuss your career opportunities.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center" style="padding: 25px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="border-radius: 10px; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); box-shadow: 0 4px 15px rgba(40, 167, 69, 0.4);">
                          <a href="${meetLink}" 
                             style="display: inline-block; color: #ffffff; text-decoration: none; padding: 16px 32px; font-size: 16px; font-weight: 600; border-radius: 10px; transition: all 0.3s ease;">
                            🚀 Join the Meeting
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Meeting Details Card -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 10px; border-left: 4px solid #28a745; margin: 25px 0;">
                <tr>
                  <td style="padding: 25px;">
                    <h3 style="margin: 0 0 15px 0; color: #28a745; font-size: 18px; font-weight: 600;">
                      📋 Meeting Details
                    </h3>
                    
                    <!-- Meeting info table -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 8px 0; font-weight: 600; color: #495057; width: 120px; vertical-align: top;">
                          🔗 Link:
                        </td>
                        <td style="padding: 8px 0; word-break: break-all;">
                          <a href="${meetLink}" style="color: #28a745; text-decoration: none; font-weight: 500;">
                            ${meetLink}
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-weight: 600; color: #495057; vertical-align: top;">
                          📅 Start:
                        </td>
                        <td style="padding: 8px 0; font-weight: 500;">
                          ${startDate}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-weight: 600; color: #495057; vertical-align: top;">
                          ⏰ End:
                        </td>
                        <td style="padding: 8px 0; font-weight: 500;">
                          ${endDate}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Tips section -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #e8f5e8; border-radius: 8px; margin: 25px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <h4 style="margin: 0 0 10px 0; color: #28a745; font-size: 16px; font-weight: 600;">
                      💡 Tips for the Meeting
                    </h4>
                    <ul style="margin: 0; padding-left: 18px; color: #495057;">
                      <li style="margin-bottom: 5px;">Join 5 minutes before the scheduled time</li>
                      <li style="margin-bottom: 5px;">Check your internet connection and microphone</li>
                      <li>Prepare any questions about the position or company</li>
                    </ul>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 25px 0 0 0; color: #6c757d;">
                We look forward to this meeting and discussing your professional goals.
              </p>
              
              <p style="margin: 15px 0 0 0; color: #28a745; font-weight: 600;">
                See you soon! 👋
              </p>
              
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; text-align: center; padding: 25px 30px; border-top: 1px solid #e9ecef;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #6c757d;">
                © 2025 Match & Go. All rights reserved.
              </p>
              <p style="margin: 0; font-size: 13px; color: #868e96;">
                Questions? Contact us: 
                <a href="mailto:support@matchandgo.com" style="color: #28a745; text-decoration: none; font-weight: 500;">
                  support@matchandgo.com
                </a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
  
</body>
</html>
  `,
            text: `
Match & Go - Meeting Invitation

Hello,

You are invited to a virtual meeting with Match & Go.

Details:
- Link: ${meetLink}
- Start date: ${startDate}
- End date: ${endDate}

We look forward to meeting with you!

© 2025 Match & Go
Support: support@matchandgo.com
  `
        };




        // 7️⃣ Envoyer le mail
        await transporter.sendMail(mailOptions);

        res.status(200).json({
            message: "Lien Jitsi Meet envoyé avec succès !",
            meetLink,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Erreur serveur", error: error.message });
    }
};
