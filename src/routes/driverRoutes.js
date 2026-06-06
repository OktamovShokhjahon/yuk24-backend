const express = require('express');
const { param, body } = require('express-validator');
const { handleValidation } = require('../middleware/validate');
const { requireDriver } = require('../middleware/auth');
const driverController = require('../controllers/driverController');

const router = express.Router();
router.use(requireDriver);

const orderIdParam = [param('id').isMongoId().withMessage('Invalid order id')];

router.get('/orders/available', driverController.getAvailableOrders);
router.post('/orders/:id/accept', orderIdParam, handleValidation, driverController.acceptOrder);
router.post('/orders/:id/cancel', orderIdParam, [body('reason').optional().trim().isString()], handleValidation, driverController.cancelOrder);
router.post('/orders/:id/picked-up', orderIdParam, handleValidation, driverController.setPickedUp);
router.post('/orders/:id/delivered', orderIdParam, [body('completedAt').optional().isISO8601()], handleValidation, driverController.setDelivered);
router.get('/me', driverController.getMe);
router.get('/reviews', driverController.getMyReviews);
router.patch('/location', [
  body('lat').isFloat({ min: -90, max: 90 }).withMessage('lat required'),
  body('lng').isFloat({ min: -180, max: 180 }).withMessage('lng required'),
], handleValidation, driverController.updateLocation);

module.exports = router;
