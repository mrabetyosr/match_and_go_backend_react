const express = require("express");
const dotenv = require("dotenv").config();
const path = require("path");
const fetch = require("node-fetch");
const dbConnect = require("./config/dbConnect");


//gemini 
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
const cors = require("cors");

dbConnect(); // Connect to the database

//app configuration
const app = express();


//middleware
//app.use(cors()); //access from any frontend
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

//routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/gemini", geminiRoutes); 
app.use("/api/offers", offerRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/quiz", quizRoutes);


//start the server
const PORT = process.env.PORT || 7002;
app.listen(PORT, () => {
    console.log(`Server is running at port ${PORT}`);
});
