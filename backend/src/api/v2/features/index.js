const express = require('express');
const router = express.Router();

// Import the new, clean V2 feature routes as we build them
const authRoutes = require('./auth/auth.routes');
// const userRoutes = require('./system/users.routes.js'); // This is an example for when you build the users feature

// Register the V2 routes
// Any request to /api/v2/auth will be handled by authRoutes
router.use('/auth', authRoutes);
// router.use('/users', userRoutes); // You will uncomment and add more lines here as you migrate each feature

module.exports = router;

