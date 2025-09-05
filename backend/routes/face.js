'use strict';

/**
 * Face routes:
 *  - POST /customers/:id/enroll  (enroll a customer's face)
 *  - POST /identify              (identify a customer from a snapshot)
 */

const express = require('express');
const router = express.Router();
const faceController = require('../controllers/faceController');

router.post('/customers/:id/enroll', faceController.enrollForCustomer);
router.post('/identify', faceController.identifyCustomer);

module.exports = router;