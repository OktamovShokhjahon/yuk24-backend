const { Order, Review } = require('../models');

async function getAvailableOrders(req, res) {
  const orders = await Order.find({ status: 'queue', deletedAt: null })
    .sort({ createdAt: 1 })
    .lean();
  res.json(orders);
}

async function acceptOrder(req, res) {
  const { id } = req.params;
  const driverId = req.driverId;
  const order = await Order.findOne({ _id: id, deletedAt: null });
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status !== 'queue') {
    return res.status(400).json({ error: 'Order not available', message: 'Order is no longer in queue' });
  }
  order.driverId = driverId;
  order.status = 'process';
  await order.save();
  res.json(order);
}

async function cancelOrder(req, res) {
  const { id } = req.params;
  const { reason } = req.body || {};
  const driverId = req.driverId;
  const order = await Order.findOne({ _id: id, deletedAt: null });
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.driverId?.toString() !== driverId.toString()) {
    return res.status(403).json({ error: 'Forbidden', message: 'Not your order' });
  }
  if (['delivered', 'cancelled'].includes(order.status)) {
    return res.status(400).json({ error: 'Cannot cancel', message: 'Order already completed or cancelled' });
  }
  order.status = 'cancelled';
  order.cancelReason = reason || '';
  await order.save();
  res.json(order);
}

async function setPickedUp(req, res) {
  const { id } = req.params;
  const driverId = req.driverId;
  const order = await Order.findOne({ _id: id, deletedAt: null });
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.driverId?.toString() !== driverId.toString()) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (order.status !== 'process') {
    return res.status(400).json({ error: 'Invalid status', message: 'Order must be in process' });
  }
  order.status = 'pickedUp';
  await order.save();
  res.json(order);
}

async function setDelivered(req, res) {
  const { id } = req.params;
  const driverId = req.driverId;
  const { completedAt } = req.body || {};
  const order = await Order.findOne({ _id: id, deletedAt: null });
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.driverId?.toString() !== driverId.toString()) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (order.status !== 'pickedUp') {
    return res.status(400).json({ error: 'Invalid status', message: 'Order must be picked up first' });
  }
  order.status = 'delivered';
  order.completedAt = completedAt ? new Date(completedAt) : new Date();
  await order.save();
  res.json(order);
}

async function loadDriverReviews(driverId) {
  const [reviewDocs, embeddedOrders] = await Promise.all([
    Review.find({ driverId }).sort({ createdAt: -1 }).lean(),
    Order.find({
      driverId,
      status: 'delivered',
      deletedAt: null,
      'review.rating': { $exists: true, $ne: null },
    })
      .select('orderId review customerName customerPhone completedAt createdAt')
      .lean(),
  ]);

  const orderMongoIds = reviewDocs.map((r) => r.orderId).filter(Boolean);
  const orders = orderMongoIds.length
    ? await Order.find({ _id: { $in: orderMongoIds } }).select('orderId').lean()
    : [];
  const displayOrderIdByMongoId = Object.fromEntries(
    orders.map((o) => [String(o._id), o.orderId])
  );

  const fromCollection = reviewDocs.map((r) => ({
    rating: r.rating,
    comment: r.comment || '',
    customerName: r.customerName || r.customerPhone || 'Customer',
    orderId: displayOrderIdByMongoId[String(r.orderId)] || String(r.orderId),
    createdAt: r.createdAt,
  }));

  const coveredOrderIds = new Set(reviewDocs.map((r) => String(r.orderId)));
  const fromOrders = embeddedOrders
    .filter((o) => !coveredOrderIds.has(String(o._id)) && o.review?.rating)
    .map((o) => ({
      rating: o.review.rating,
      comment: o.review.comment || '',
      customerName: o.customerName || o.customerPhone || 'Customer',
      orderId: o.orderId || String(o._id),
      createdAt: o.completedAt || o.createdAt,
    }));

  return [...fromCollection, ...fromOrders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

async function getMe(req, res) {
  const driver = req.driver;
  const [completedCount, cancelledCount, delivered, reviews] = await Promise.all([
    Order.countDocuments({ driverId: driver._id, status: 'delivered', deletedAt: null }),
    Order.countDocuments({ driverId: driver._id, status: 'cancelled', deletedAt: null }),
    Order.find({ driverId: driver._id, status: 'delivered', deletedAt: null })
      .select('durationMin completedAt')
      .lean(),
    loadDriverReviews(driver._id),
  ]);
  const totalMin = delivered.reduce((acc, o) => acc + (o.durationMin || 0), 0);
  const avgDeliveryMin = delivered.length ? Math.round(totalMin / delivered.length) : null;

  const profile = driver.toJSON ? driver.toJSON() : driver;
  res.json({
    ...profile,
    stats: {
      completedOrders: completedCount,
      cancelledOrders: cancelledCount,
      avgDeliveryMin,
    },
    reviews,
  });
}

async function getMyReviews(req, res) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const driverId = req.driver._id;

  const [total, reviewDocs, avgAgg] = await Promise.all([
    Review.countDocuments({ driverId }),
    Review.find({ driverId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('orderId', 'orderId completedAt')
      .lean(),
    Review.aggregate([
      { $match: { driverId } },
      { $group: { _id: null, avg: { $avg: '$rating' } } },
    ]),
  ]);

  const reviews = reviewDocs.map((r) => ({
    _id: r._id,
    orderId: r.orderId
      ? {
          _id: r.orderId._id,
          orderId: r.orderId.orderId,
          completedAt: r.orderId.completedAt,
        }
      : null,
    driverId: r.driverId,
    rating: r.rating,
    comment: r.comment || '',
    customerName: r.customerName,
    customerPhone: r.customerPhone,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));

  const avgRating = avgAgg[0]?.avg != null
    ? Math.round(avgAgg[0].avg * 10) / 10
    : null;

  res.json({
    reviews,
    summary: {
      avgRating,
      totalReviews: total,
    },
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  });
}

async function updateLocation(req, res) {
  const { lat, lng } = req.body;
  const driver = req.driver;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: 'lat and lng must be numbers' });
  }
  driver.currentLocation = {
    type: 'Point',
    coordinates: [lng, lat],
  };
  driver.lastSeenAt = new Date();
  await driver.save();
  res.json({ ok: true, lastSeenAt: driver.lastSeenAt });
}

module.exports = {
  getAvailableOrders,
  acceptOrder,
  cancelOrder,
  setPickedUp,
  setDelivered,
  getMe,
  getMyReviews,
  updateLocation,
};
