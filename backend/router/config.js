require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || "rohitpicoin";
module.exports = { JWT_SECRET };
