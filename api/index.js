// Vercel serverless function entry point
// Check if we're in the right directory structure
try {
  // Try to require from backend folder (monorepo structure)
  const app = require('../backend/index.js');
  module.exports = app;
} catch (error) {
  console.error('Could not require backend/index.js:', error.message);
  
  // Fallback: basic API response
  module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    res.status(500).json({ 
      error: 'Backend not properly configured',
      path: req.url,
      method: req.method
    });
  };
}