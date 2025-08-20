const express = require("express");
const verifyToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");
const { updatePhoto,DeleteUserById } = require("../controllers/userController");
const uploadfile = require("../middleware/uploadFile");
const router = express.Router();

//only admin can access this route
router.get("/admin", verifyToken, authorizeRoles("admin"), (req, res) => {
    res.json({ message: "welcome admin" });

});
//only admin and recruter  can access this route
router.get("/company", verifyToken, authorizeRoles("company", "admin"), (req, res) => {
    res.json({ message: "welcome company" });
});

//all can access this route
router.get("/candidate", verifyToken, authorizeRoles("candidate", "admin", "company"), (req, res) => {
    res.json({ message: "welcome candidate" });
});

// Update user photo
router.put(
  "/update-photo",
  verifyToken,
  uploadfile.single("image_User"), 
  updatePhoto
);

// Delete user by ID
router.delete("/delete/:id", verifyToken, authorizeRoles("admin"), DeleteUserById);

module.exports = router;