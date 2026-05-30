const { body, param, query } = require('express-validator');
const { handleValidation } = require('../middleware/validate');

const coordsValidator = (key) =>
  body(key)
    .isObject()
    .withMessage(`${key} must be object with label and coords`)
    .custom((v) => {
      if (!v.label || !Array.isArray(v.coords) || v.coords.length !== 2) return false;
      const [lat, lng] = v.coords;
      if (typeof lat !== 'number' || typeof lng !== 'number') return false;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
      return true;
    })
    .withMessage(`${key} must have label (string) and coords [lat, lng]`);

const createOrderRules = [
  body('customerPhone').trim().notEmpty().withMessage('customerPhone required'),
  body('pickup').custom((v) => {
    if (!v || typeof v !== 'object' || !v.label || !Array.isArray(v.coords) || v.coords.length !== 2) return false;
    const [lat, lng] = v.coords;
    return typeof lat === 'number' && typeof lng === 'number' && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }).withMessage('pickup must have label and coords [lat, lng]'),
  body('delivery').custom((v) => {
    if (!v || typeof v !== 'object' || !v.label || !Array.isArray(v.coords) || v.coords.length !== 2) return false;
    const [lat, lng] = v.coords;
    return typeof lat === 'number' && typeof lng === 'number' && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }).withMessage('delivery must have label and coords [lat, lng]'),
  body('loadSize').isIn(['xsmall', 'small', 'medium', 'large', 'xlarge']).withMessage('Invalid loadSize'),
  body('unloading').isBoolean({ strict: true }).withMessage('unloading must be a boolean'),
  body('price').isFloat({ min: 0 }).withMessage('price must be non-negative number'),
  body('distanceKm').isFloat({ min: 0 }).withMessage('distanceKm must be non-negative number'),
  body('durationMin').optional().isInt({ min: 0 }),
  body('customerName').optional().trim().isString(),
];

const reviewRules = [
  param('id').isMongoId().withMessage('Invalid order id'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('rating 1-5 required'),
  body('comment').optional().trim().isString(),
];

const orderIdParam = [param('id').isMongoId().withMessage('Invalid order id')];
const phoneQuery = [query('phone').trim().notEmpty().withMessage('phone query required')];

module.exports = {
  createOrder: [createOrderRules, handleValidation],
  addReview: [reviewRules, handleValidation],
  orderIdParam: [orderIdParam, handleValidation],
  phoneQuery: [phoneQuery, handleValidation],
};
