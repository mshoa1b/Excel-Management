// app.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth");                  
const businessRoutes = require("./routes/business");          
const usersRoutes = require("./routes/users");
const sheetsRoutes = require("./routes/sheets");
const statsRoutes = require("./routes/stats");
const bmOrdersRoutes = require("./routes/bmOrders");
const backmarketCredsRoutes = require("./routes/backmarket"); 

const app = express();

// Middlewares
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") || true }));
app.use(express.json()); 

// Health
app.get("/", (_req, res) => res.send("SaaS Backend is running"));

// Mount SPECIFIC routers first
app.use("/api/auth", authRoutes);                 
app.use("/api/businesses", businessRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/sheets", sheetsRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/bmOrders", bmOrdersRoutes);

app.use("/api", backmarketCredsRoutes);

// Add init route for one-time database setup
const initRoutes = require("./routes/init");
app.use("/api/init", initRoutes);

app.use((req, res) => {
  res.status(404).json({ message: `Not Found: ${req.method} ${req.originalUrl}` });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

// Export for Vercel serverless functions
module.exports = app;
