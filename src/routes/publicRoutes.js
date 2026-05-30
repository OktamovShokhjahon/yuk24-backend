const express = require('express');
const { body } = require('express-validator');
const { handleValidation } = require('../middleware/validate');
const { health } = require('../controllers/healthController');
const { getRoute, getPrice } = require('../controllers/publicController');
const { apiLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.get('/health', health);

router.post(
  '/route',
  apiLimiter,
  [
    body('start').isArray().withMessage('start must be array [lat, lng]'),
    body('end').isArray().withMessage('end must be array [lat, lng]'),
  ],
  handleValidation,
  getRoute
);

router.post(
  '/price',
  apiLimiter,
  [
    body('distanceKm').isFloat({ min: 0 }).withMessage('distanceKm required and >= 0'),
    body('loadSize').isIn(['xsmall', 'small', 'medium', 'large', 'xlarge']).withMessage('Invalid loadSize'),
    body('unloading').isBoolean({ strict: true }).withMessage('unloading must be a boolean'),
  ],
  handleValidation,
  getPrice
);

module.exports = router;
