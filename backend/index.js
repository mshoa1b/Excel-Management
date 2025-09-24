const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const businessRoutes = require("./routes/business");
const usersRoutes = require("./routes/users");     // ← add this
const sheetsRoutes = require("./routes/sheets");   // ← ensure file is named sheets.js
const statsRoutes = require("./routes/stats");

const app = express();

app.use(cors());
app.use(bodyParser.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/businesses", businessRoutes);
app.use("/api/users", usersRoutes);      // ← add this
app.use("/api/sheets", sheetsRoutes);
app.use("/api/stats", statsRoutes);

// Health Check
app.get("/", (req, res) => res.send("SaaS Backend is running"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
