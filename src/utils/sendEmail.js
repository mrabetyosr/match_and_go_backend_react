const nodemailer = require("nodemailer");

const sendEmail = async (to, subject, text) => {
  // Configuration du transporteur
  const transporter = nodemailer.createTransport({
    service: "gmail", // tu peux utiliser "hotmail", "yahoo", ou SMTP personnalisé
    auth: {
      user: process.env.EMAIL_USER, // ton email
      pass: process.env.EMAIL_PASS, // mot de passe ou "App Password"
    },
  });

  // Contenu du mail
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
  };

  // Envoi du mail
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
