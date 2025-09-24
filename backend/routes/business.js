const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const { createBusiness, getBusinesses } = require("../models/Business");

// GET /api/businesses
router.get("/", authenticateToken, async (req, res) => {
  try {
    const businesses = await getBusinesses();
    return res.json(businesses);
  } catch (err) {
    console.error("GET /api/businesses error:", err);
    return res.status(500).json({ message: "Failed to fetch businesses" });
  }
});

// POST /api/businesses  (restrict to superadmin role_id = 1)
router.post("/", authenticateToken, async (req, res) => {
  try {
    if (req.user.role_id !== 1) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    const business = await createBusiness(req.body);
    return res.status(201).json(business);
  } catch (err) {
    console.error("POST /api/businesses error:", err);
    return res.status(500).json({ message: "Failed to create business" });
  }
});

module.exports = router;
