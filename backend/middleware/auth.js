const jwt = require("jsonwebtoken");
require("dotenv").config();

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  const token = authHeader && authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (!token) {
    return res.status(401).json({ message: "Token missing" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      // Expired or invalid token
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Normalize so downstream code can rely on req.user.id
    req.user = {
      id: decoded.id ?? decoded.sub ?? null,
      role_id: decoded.role_id ?? decoded.roleId ?? decoded.role ?? null,
      username: decoded.username ?? null,
      _claims: decoded
    };

    return next();
  });
};

module.exports = authenticateToken;
