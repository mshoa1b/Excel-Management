// app.js
const express = require("express");
const cors = require("cors");

// Load environment variables (Vercel handles this automatically)
if (process.env.NODE_ENV !== 'production') {
  require("dotenv").config();
}

const authRoutes = require("./routes/auth");                  
const businessRoutes = require("./routes/business");          
const usersRoutes = require("./routes/users");
const sheetsRoutes = require("./routes/sheets");
const statsRoutes = require("./routes/stats");
const bmOrdersRoutes = require("./routes/bmOrders");
const backmarketCredsRoutes = require("./routes/backmarket");
const attachmentRoutes = require("./routes/attachments");
const enquiriesRoutes = require("./routes/enquiries");
const { router: notificationsRoutes } = require("./routes/notifications"); 

const app = express();

// Middlewares
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.CORS_ORIGIN?.split(",") || [
      'http://localhost:3000',
      'https://excel-management-rho.vercel.app'
    ];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));

// Conditional JSON parsing - skip for attachment upload routes
app.use((req, res, next) => {
  // Skip JSON parsing for attachment upload routes
  const isAttachmentUpload = req.url.includes('/api/attachments/upload') || 
                           req.url.includes('/attachments') ||
                           (req.url.includes('/api/enquiries/') && req.url.includes('/attachments'));
  
  console.log('Request URL:', req.url, 'Skip JSON parsing:', isAttachmentUpload);
  
  if (isAttachmentUpload) {
    next();
  } else {
    // Apply JSON parsing for other routes
    express.json()(req, res, next);
  }
});

// CORS middleware handles preflight requests automatically

// Health check with environment info
app.get("/", (_req, res) => {
  const envCheck = {
    status: "SaaS Backend is running",
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      JWT_SECRET: process.env.JWT_SECRET ? "✅ Set" : "❌ Missing",
      DATABASE_URL: process.env.DATABASE_URL ? "✅ Set" : "❌ Missing",
      CORS_ORIGIN: process.env.CORS_ORIGIN || "Not set",
      IONOS_SFTP_HOST: process.env.IONOS_SFTP_HOST ? "✅ Set" : "❌ Missing"
    }
  };
  res.json(envCheck);
});

// API base route
app.get("/api", (_req, res) => {
  res.json({
    status: "API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    endpoints: [
      "/api/auth",
      "/api/businesses", 
      "/api/users",
      "/api/sheets",
      "/api/stats",
      "/api/bmOrders",
      "/api/attachments",
      "/api/init"
    ]
  });
});

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Origin:', req.get('Origin'));
  console.log('Headers:', req.headers);
  next();
});

// Mount SPECIFIC routers first
app.use("/api/auth", authRoutes);                 
app.use("/api/businesses", businessRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/sheets", sheetsRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/bmOrders", bmOrdersRoutes);
app.use("/api/attachments", attachmentRoutes);
app.use("/api/enquiries", enquiriesRoutes);
app.use("/api/notifications", notificationsRoutes);

app.use("/api", backmarketCredsRoutes);

// Add init route for one-time database setup
const initRoutes = require("./routes/init");
app.use("/api/init", initRoutes);



// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

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
