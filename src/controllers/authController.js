const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

const register = async (req, res) => {
  try {
    const { username, email, password, role, location, category, founded, size, website, linkedin } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role: role || "candidate",
    });

    // 🔥 Si c'est une entreprise, on ajoute les infos spécifiques
    if (role === "company") {
      newUser.companyInfo = {
        location,
        category,
        founded,
        size,
        website,
        linkedin
      };
    }

    await newUser.save();

    res.status(201).json({ 
      message: `User registered with username ${username}`, 
      role: newUser.role 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "something went wrong" });
  }
};






const login = async (req, res) => {
   try { 
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
        return res.status(404).json({message: `User with username ${email} not found`})
    } 

    const isMatch = await bcrypt.compare(password, user.password)
    if(!isMatch){
        return res.status(400).json({message : `Invalid credentails`})
    }

    const token = jwt.sign({id: user._id, role: user.role},process.env.JWT_SECRET,{ expiresIn: "1h" });
    
    res.status(200).json({ token })
}
    catch (err) {
        res.status(500).json({message:`Something went wrong`})
    }
};

// current user
const getCurrentUser = async (req, res) => {
    try {
        // req.user est défini par le middleware verifyToken
        const user = await User.findById(req.user.id).select("username image_User email role");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Something went wrong" });
    }
};

module.exports = {
    register,
    login,
    getCurrentUser,
};