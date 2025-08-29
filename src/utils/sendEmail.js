// utils/sendEmail.js
const nodemailer = require("nodemailer");

const sendEmail = async (to, quiz) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; color:#333; padding:20px; line-height:1.6;">
      <h2 style="color:#2a9d8f;">✅ Your Quiz Has Been Published!</h2>
      <p>Hello,</p>
      <p>We are pleased to inform you that your quiz <b>"${quiz.title}"</b> has been successfully published.</p>
      <p><b>Quiz Details:</b></p>
      <ul>
        <li>📌 <b>Title:</b> ${quiz.title}</li>
        <li>📝 <b>Number of Questions:</b> ${quiz.nbrQuestions}</li>
        <li>⏳ <b>Duration:</b> ${Math.floor(quiz.durationSeconds / 60)} minutes</li>
        <li>📊 <b>Total Score:</b> ${quiz.totalScore}</li>
        <li>📅 <b>Created on:</b> ${quiz.createdAt ? new Date(quiz.createdAt).toLocaleDateString() : "N/A"}</li>
      </ul>
      <p style="margin-top:20px;">Your quiz is now live and candidates can start answering it.</p>
      <p style="margin-top:20px;">Thank you for using our platform.<br/>
      <span style="color:#2a9d8f;">The Recruitment Team</span></p>
    </div>
  `;

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: `Your quiz "${quiz.title}" has been published`,
    html: htmlContent,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
