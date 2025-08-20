const fs = require("fs");
const { GoogleGenerativeAI } = require("@google/generative-ai");

if (!process.env.GEMINI_API_KEY) {
  console.error("❌ Error: GEMINI_API_KEY is missing in .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.handleGeminiRequest = async (req, res) => {
  const userInput = req.body.msg;
  const file = req.file;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    let prompt = [userInput];

    if (file) {
      const fileData = fs.readFileSync(file.path);
      const image = {
        inlineData: {
          data: fileData.toString("base64"),
          mimeType: file.mimetype,
        },
      };
      prompt.push(image);
    }

    const response = await model.generateContent(prompt);
    res.send(response.response.text());
  } catch (error) {
    console.error("❌ Error generating response:", error);
    res.status(500).send("An error occurred while generating the response");
  } finally {
    if (file) fs.unlinkSync(file.path);
  }
};