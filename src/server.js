const express = require("express");
const dotenv = require("dotenv").config();
const fetch = require("node-fetch");
const dbConnect = require("./config/dbConnect"); 
const notificationRoutes = require("./routes/notificationRoutes");


// Gemini
global.fetch = fetch;
global.Headers = fetch.Headers;
global.Request = fetch.Request;
global.Response = fetch.Response;

// Import des routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const geminiRoutes = require("./routes/geminiRoutes");
const offerRoutes = require("./routes/offerRoutes");
const questionRoutes = require("./routes/questionRoutes");
const quizRoutes = require("./routes/quizRoutes");
const applicationRoutes = require("./routes/applicationRoutes");

const cors = require("cors");

// Socket utils
const { initSocket } = require("./utils/socket");

// Connect to DB
dbConnect();

// App configuration
const app = express();
const server = require("http").createServer(app);

// Middleware
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/gemini", geminiRoutes); 
app.use("/api/offers", offerRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/notify", notificationRoutes);
app.use("/api/applications", applicationRoutes);



const PORT = process.env.PORT || 7002;
server.listen(PORT, () => {
    console.log(`Server is running at port ${PORT}`);
});


initSocket(server);


module.exports = server;
