const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');
const adminValidator = require('../validators/adminValidator');

const router = express.Router();
router.use(requireAdmin);

router.get('/stats', adminController.getStats);
router.get('/orders', adminController.listOrders);
router.get('/orders/:id', adminValidator.orderIdParam, adminController.getOrderById);
router.get('/drivers', adminController.listDrivers);
router.get('/drivers/:id', adminValidator.driverIdParam, adminController.getDriverById);
router.post('/drivers', adminValidator.createDriver, adminController.createDriver);
router.patch('/drivers/:id', adminValidator.updateDriver, adminController.updateDriver);
router.delete('/drivers/:id', adminValidator.driverIdParam, adminController.deleteDriver);
router.get('/charts/orders', adminController.getChartsOrders);
router.get('/charts/revenue', adminController.getChartsRevenue);

module.exports = router;
