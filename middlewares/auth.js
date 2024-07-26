const jwt = require("jsonwebtoken");
const { SESSION_SECRET } = require("../config");

const authMiddleware = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) {
    return res.status(401).send("Access Denied");
  }
  try {
    const decoded = jwt.verify(token, SESSION_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(400).send("Invalid token");
  }
};

module.exports = authMiddleware;
