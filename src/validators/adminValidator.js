const { body, param } = require('express-validator');
const { handleValidation } = require('../middleware/validate');

const createDriverRules = [
  body('username').trim().notEmpty().withMessage('username required'),
  body('password').isLength({ min: 6 }).withMessage('password min 6 characters'),
  body('active').optional().isBoolean(),
  body('name').optional().trim().isString(),
  body('phone').optional().trim().isString(),
  body('vehicleInfo').optional().trim().isString(),
];

const updateDriverRules = [
  param('id').isMongoId().withMessage('Invalid driver id'),
  body('username').optional().trim().notEmpty(),
  body('active').optional().isBoolean(),
  body('name').optional().trim().isString(),
  body('phone').optional().trim().isString(),
  body('vehicleInfo').optional().trim().isString(),
  body('password').optional().isLength({ min: 6 }),
];

const driverIdParam = [param('id').isMongoId().withMessage('Invalid driver id')];
const orderIdParam = [param('id').isMongoId().withMessage('Invalid order id')];

module.exports = {
  createDriver: [createDriverRules, handleValidation],
  updateDriver: [updateDriverRules, handleValidation],
  driverIdParam: [driverIdParam, handleValidation],
  orderIdParam: [orderIdParam, handleValidation],
};
