// backend/src/routes/ui.js
const express = require('express');
const router = express.Router();

// Import the named handlers we just exported
const {
  getMenus,
  getPermissions,
  getFeatures,
} = require('../controllers/uiController');

// Routes (these are mounted behind auth + permissions in server.js)
router.get('/menus', getMenus);
router.get('/permissions', getPermissions);
router.get('/features', getFeatures);

module.exports = router;
