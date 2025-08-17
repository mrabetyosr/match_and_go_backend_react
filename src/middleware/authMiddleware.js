const jwt = require("jsonwebtoken");


const verifyToken = (req, res, next) => {
    let token;
    /* let authHeader = req.header.Authorization || req.header.authorization; */
    let authHeader = req.headers["authorization"];

    if (authHeader && authHeader.startsWith("Bearer")) {
        token = authHeader.split(" ")[1];

        if(!token) {
            return res
            .status(401)
            .json({ message: "No token, authorization denied " });
        } 
        try{
            const deccode = jwt.verify(token, process.env.JWT_SECRET);
            req.user = deccode;
            console.log("decoded user is: ", req.user);
            next();

        }catch(err) {
            res.status(400).json({ message: "Invalid token" });
        }


}
    else {
        return res
        .status(401)
        .json({ message: "No token, authorization denied" });
    }
};

module.exports = verifyToken;