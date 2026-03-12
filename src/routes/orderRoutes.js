const express = require('express');
const orderController = require('../controllers/orderController');
const orderValidator = require('../validators/orderValidator');
const { apiLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/orders', apiLimiter, orderValidator.createOrder, orderController.createOrder);
router.get('/orders/by-phone', apiLimiter, orderValidator.phoneQuery, orderController.getOrdersByPhone);
router.get('/orders/:id', apiLimiter, orderValidator.orderIdParam, orderController.getOrderById);
router.post('/orders/:id/review', apiLimiter, orderValidator.addReview, orderController.addReview);

module.exports = router;
