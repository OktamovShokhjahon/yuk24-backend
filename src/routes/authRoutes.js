const express = require('express');
const { adminLogin, driverLogin } = require('../controllers/authController');
const { adminLogin: adminLoginVal, driverLogin: driverLoginVal } = require('../validators/authValidator');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/admin/login', authLimiter, adminLoginVal, adminLogin);
router.post('/driver/login', authLimiter, driverLoginVal, driverLogin);

module.exports = router;
