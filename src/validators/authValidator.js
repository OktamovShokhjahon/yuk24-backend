const { body } = require('express-validator');
const { handleValidation } = require('../middleware/validate');

const adminLoginRules = [
  body('username').trim().notEmpty().withMessage('Username required'),
  body('password').notEmpty().withMessage('Password required'),
];

const driverLoginRules = [
  body('username').trim().notEmpty().withMessage('Username required'),
  body('password').notEmpty().withMessage('Password required'),
];

module.exports = {
  adminLogin: [adminLoginRules, handleValidation],
  driverLogin: [driverLoginRules, handleValidation],
};
