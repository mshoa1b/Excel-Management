const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const businessRoutes = require("./routes/business");
const usersRoutes = require("./routes/users");    
const sheetsRoutes = require("./routes/sheets");   
const statsRoutes = require("./routes/stats");
const bmOrdersRouter = require('./routes/bmOrders');

const app = express();

app.use(cors());
app.use(bodyParser.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/businesses", businessRoutes);
app.use("/api/users", usersRoutes);      
app.use("/api/sheets", sheetsRoutes);
app.use("/api/stats", statsRoutes);
app.use('/api/bmOrders', bmOrdersRouter);

// Health Check
app.get("/", (req, res) => res.send("SaaS Backend is running"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
