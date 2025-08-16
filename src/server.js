const express = require("express");
const dotenv = require("dotenv").config();
const dbConnect = require("./config/dbConnect");
const authRoutes = require("./routes/authRoutes");

dbConnect(); // Connect to the database

//app configuration
const app = express();


//middleware
//app.use(cors()); //access from any frontend
app.use(express.json());

//routes
app.use("/api/auth", authRoutes);

//start the server
const PORT = process.env.PORT || 7002;
app.listen(PORT, () => {
    console.log(`Server is running at port ${PORT}`);
});
