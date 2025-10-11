// middleware/auth.js
// Verifies Bearer JWT tokens and populates req.user
// Expects tokens signed with HS256 and the same issuer/audience used when signing.

const jwt = require("jsonwebtoken");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("❌ JWT_SECRET is not set in environment variables");
}

const JWT_BASE = {
  issuer: process.env.JWT_ISSUER || "auth",
  audience: process.env.JWT_AUDIENCE || "api"
};

// Verification options: explicitly allow only HS256
const VERIFY_OPTS = {
  ...JWT_BASE,
  algorithms: ["HS256"]
};

/**
 * authenticateToken middleware
 * - expects Authorization: Bearer <token>
 * - verifies token and places normalized req.user with fields:
 *   { id, role_id, business_id, username, _claims }
 */
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

    if (!token) {
      return res.status(401).json({ message: "Token missing" });
    }

    jwt.verify(token, JWT_SECRET, VERIFY_OPTS, (err, decoded) => {
      if (err) {
        // Possible errors: TokenExpiredError, JsonWebTokenError, NotBeforeError
        // Provide a clear 401 response without leaking internals
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Normalise user object for downstream handlers
      req.user = {
        id: decoded.id ?? decoded.sub ?? null,
        role_id: decoded.role_id ?? decoded.roleId ?? decoded.role ?? null,
        business_id: decoded.business_id ?? decoded.biz ?? null,
        username: decoded.username ?? null,
        _claims: decoded
      };

      return next();
    });
  } catch (e) {
    // Defensive catch for unexpected errors
    console.error("authenticateToken middleware error:", e);
    return res.status(500).json({ message: "Authentication failed" });
  }
};

module.exports = authenticateToken;
