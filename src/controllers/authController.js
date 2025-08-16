const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

const register = async(req, res) => {
    try {
    const { username, email, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
        username,
        email,
        password: hashedPassword,
        role
    });
    await newUser.save();
    res
    .status(201)
    .json({ message: `User registered with email ${email}` });
} catch (err) {
res
    .status(500)
    .json({ message: "something went wrong" });    }
};



const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res
            .status(404)
            .json({ message: `User with  email ${email} not found` });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res
            .status(400)
            .json({ message: "Invalid credentials" });
        }
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );
        res.status(200).json({ token });
        
    }    catch (err) {
        res.status(500).json({ message: "something went wrong" });
    }
};

module.exports = {
    register,
    login,
};