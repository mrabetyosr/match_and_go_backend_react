const express = require("express");
const verifyToken = require("../middleware/authMiddleware");

const router = express.Router();

//only admin can access this route
router.get("/admin", verifyToken, (req, res) => {
    res.json({ message: "welcom admin" });

});
//only admin and recruter  can access this route
router.get("/company", verifyToken, (req, res) => {
    res.json({ message: "welcom company" });
});

//all can access this route
router.get("/candidate", verifyToken, (req, res) => {
    res.json({ message: "welcom candidate" });
});


module.exports = router;