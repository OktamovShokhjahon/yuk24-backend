const { Order, Driver } = require('../models');

async function getStats(req, res) {
  const [totalOrders, completedOrders, totalDrivers, activeDrivers, revenueResult] = await Promise.all([
    Order.countDocuments({ deletedAt: null }),
    Order.countDocuments({ status: 'delivered', deletedAt: null }),
    Driver.countDocuments({ deletedAt: null }),
    Driver.countDocuments({ active: true, deletedAt: null }),
    Order.aggregate([
      { $match: { status: 'delivered', deletedAt: null } },
      { $group: { _id: null, total: { $sum: '$price' } } },
    ]),
  ]);
  const revenue = revenueResult[0]?.total ?? 0;
  res.json({
    totalOrders,
    completedOrders,
    revenue: Math.round(revenue * 100) / 100,
    activeDrivers,
    totalDrivers,
  });
}

async function listOrders(req, res) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const status = req.query.status;
  const search = req.query.search;
  const dateFrom = req.query.dateFrom;
  const dateTo = req.query.dateTo;

  const filter = { deletedAt: null };
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { orderId: new RegExp(search, 'i') },
      { customerPhone: new RegExp(search, 'i') },
      { customerName: new RegExp(search, 'i') },
    ];
  }
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo);
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('driverId', 'username name phone')
      .lean(),
    Order.countDocuments(filter),
  ]);
  res.json({
    orders,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}

async function getOrderById(req, res) {
  const order = await Order.findOne({ _id: req.params.id, deletedAt: null })
    .populate('driverId', 'username name phone vehicleInfo')
    .lean();
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
}

async function listDrivers(req, res) {
  const drivers = await Driver.find({ deletedAt: null }).lean();
  const driverIds = drivers.map((d) => d._id);
  const [completedCounts, cancelledCounts] = await Promise.all([
    Order.aggregate([
      { $match: { driverId: { $in: driverIds }, status: 'delivered', deletedAt: null } },
      { $group: { _id: '$driverId', count: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: { driverId: { $in: driverIds }, status: 'cancelled', deletedAt: null } },
      { $group: { _id: '$driverId', count: { $sum: 1 } } },
    ]),
  ]);
  const completedMap = Object.fromEntries(completedCounts.map((c) => [c._id.toString(), c.count]));
  const cancelledMap = Object.fromEntries(cancelledCounts.map((c) => [c._id.toString(), c.count]));
  const list = drivers.map((d) => ({
    ...d,
    completedOrders: completedMap[d._id.toString()] ?? 0,
    cancelledOrders: cancelledMap[d._id.toString()] ?? 0,
  }));
  res.json(list);
}

async function getDriverById(req, res) {
  const driver = await Driver.findOne({ _id: req.params.id, deletedAt: null }).lean();
  if (!driver) return res.status(404).json({ error: 'Driver not found' });
  const [orders, reviews] = await Promise.all([
    Order.find({ driverId: driver._id, deletedAt: null })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
    require('../models').Review.find({ driverId: driver._id }).sort({ createdAt: -1 }).lean(),
  ]);
  const completedOrders = await Order.countDocuments({ driverId: driver._id, status: 'delivered', deletedAt: null });
  const cancelledOrders = await Order.countDocuments({ driverId: driver._id, status: 'cancelled', deletedAt: null });
  res.json({
    ...driver,
    stats: { completedOrders, cancelledOrders },
    orders,
    reviews,
  });
}

async function createDriver(req, res) {
  const bcrypt = require('bcryptjs');
  const { username, password, active, name, phone, vehicleInfo } = req.body;
  const existing = await Driver.findOne({ username, deletedAt: null });
  if (existing) return res.status(400).json({ error: 'Username already exists' });
  const passwordHash = await bcrypt.hash(password, 10);
  const driver = await Driver.create({
    username,
    passwordHash,
    active: active !== false,
    name: name || undefined,
    phone: phone || undefined,
    vehicleInfo: vehicleInfo || undefined,
  });
  res.status(201).json(driver);
}

async function updateDriver(req, res) {
  const { id } = req.params;
  const driver = await Driver.findOne({ _id: id, deletedAt: null });
  if (!driver) return res.status(404).json({ error: 'Driver not found' });
  const { username, active, name, phone, vehicleInfo, password } = req.body;
  if (username !== undefined) driver.username = username;
  if (active !== undefined) driver.active = active;
  if (name !== undefined) driver.name = name;
  if (phone !== undefined) driver.phone = phone;
  if (vehicleInfo !== undefined) driver.vehicleInfo = vehicleInfo;
  if (password) {
    const bcrypt = require('bcryptjs');
    driver.passwordHash = await bcrypt.hash(password, 10);
  }
  await driver.save();
  res.json(driver);
}

async function deleteDriver(req, res) {
  const driver = await Driver.findOne({ _id: req.params.id, deletedAt: null });
  if (!driver) return res.status(404).json({ error: 'Driver not found' });
  driver.deletedAt = new Date();
  driver.active = false;
  await driver.save();
  res.json({ message: 'Driver deactivated' });
}

async function getChartsOrders(req, res) {
  const days = Math.min(90, Math.max(7, parseInt(req.query.days, 10) || 30));
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  const data = await Order.aggregate([
    { $match: { createdAt: { $gte: start }, deletedAt: null } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  res.json(data.map((d) => ({ date: d._id, orders: d.count })));
}

async function getChartsRevenue(req, res) {
  const days = Math.min(90, Math.max(7, parseInt(req.query.days, 10) || 30));
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  const data = await Order.aggregate([
    { $match: { status: 'delivered', deletedAt: null } },
    {
      $project: {
        revenue: '$price',
        date: { $ifNull: ['$completedAt', '$updatedAt'] },
      },
    },
    { $match: { date: { $gte: start } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, revenue: { $sum: '$revenue' } } },
    { $sort: { _id: 1 } },
  ]);
  res.json(data.map((d) => ({ date: d._id, revenue: Math.round(d.revenue * 100) / 100 })));
}

module.exports = {
  getStats,
  listOrders,
  getOrderById,
  listDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  deleteDriver,
  getChartsOrders,
  getChartsRevenue,
};
