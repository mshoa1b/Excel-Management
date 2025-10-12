// middleware/optionalAuth.js
// Optional authentication that allows tokens from headers or query params
// Used for file access endpoints that need to work with direct links

const jwt = require("jsonwebtoken");

// Load environment variables from .env file (only in development)
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const JWT_SECRET = process.env.JWT_SECRET;

const JWT_BASE = {
  issuer: process.env.JWT_ISSUER || "auth",
  audience: process.env.JWT_AUDIENCE || "api"
};

const VERIFY_OPTS = {
  ...JWT_BASE,
  algorithms: ["HS256"]
};

/**
 * optionalAuth middleware
 * - checks for token in Authorization header OR query parameter
 * - if valid token found, sets req.user
 * - if no token or invalid token, continues without req.user (allows public access)
 */
const optionalAuth = (req, res, next) => {
  try {
    // Try to get token from Authorization header first
    let token = null;
    const authHeader = req.headers.authorization || req.headers.Authorization || "";
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    }
    
    // If no header token, try query parameter
    if (!token && req.query.token) {
      token = req.query.token;
    }

    // If no token found, continue without authentication
    if (!token) {
      return next();
    }

    // Verify token if found
    jwt.verify(token, JWT_SECRET, VERIFY_OPTS, (err, decoded) => {
      if (err) {
        // Invalid token - continue without auth (public access)
        return next();
      }

      // Valid token - set user object
      req.user = {
        id: decoded.id,
        role_id: decoded.role_id,
        business_id: decoded.business_id,
        username: decoded.username,
        _claims: decoded
      };
      
      next();
    });
  } catch (error) {
    console.error("Optional auth error:", error);
    // Continue without auth on any error
    next();
  }
};

module.exports = optionalAuth;