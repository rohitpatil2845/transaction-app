const { JWT_SECRET } = require("./config");
const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(403).json({
            message: "Invalid user Header1", // Token not present or badly formatted
        });
    }

    const token = authHeader.split(" ")[1].trim();

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        if (decoded.userId) {
            req.userId = decoded.userId;
            next();
        } else {
            return res.status(403).json({
                message: "Invalid user Header2", // Token didn't contain userId
            });
        }
    } catch (err) {
        console.error("JWT Verification Error:", err.message);
        return res.status(403).json({
            message: "Invalid user Header3", // Token verification failed
        });
    }
};

module.exports = {
    authMiddleware
};
