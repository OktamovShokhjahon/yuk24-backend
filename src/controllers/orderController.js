const { Order, Review } = require('../models');
const { calculatePrice } = require('../utils/pricing');

async function getNextOrderId() {
  const last = await Order.findOne({}, { orderId: 1 }).sort({ createdAt: -1 }).lean();
  if (!last || !last.orderId) return 'ORD-1001';
  const match = last.orderId.match(/ORD-(\d+)/);
  const num = match ? parseInt(match[1], 10) + 1 : 1001;
  return `ORD-${num}`;
}

async function createOrder(req, res) {
  const {
    customerPhone,
    customerName,
    pickup,
    delivery,
    loadSize,
    unloading,
    distanceKm,
    durationMin,
    userId,
  } = req.body;
  const { price } = req.body;
  const computed = calculatePrice({ distanceKm, loadSize, unloading });
  if (typeof price !== 'number' || !Number.isFinite(price) || Math.abs(price - computed) > 1) {
    return res.status(400).json({
      error: 'Price mismatch',
      details: `Client price ${price} differs from server-computed price ${computed} by more than 1 UZS`,
    });
  }
  const finalPrice = computed;
  const orderId = await getNextOrderId();
  const order = await Order.create({
    orderId,
    customerPhone,
    customerName: customerName || undefined,
    pickup: { label: pickup.label, coords: pickup.coords },
    delivery: { label: delivery.label, coords: delivery.coords },
    loadSize,
    unloading,
    price: finalPrice,
    distanceKm,
    durationMin: durationMin ?? undefined,
    status: 'queue',
    userId: userId || undefined,
  });
  res.status(201).json(order);
}

async function getOrderById(req, res) {
  const { id } = req.params;
  const order = await Order.findOne({ _id: id, deletedAt: null }).populate('driverId', 'username name phone').lean();
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const phone = req.query.phone;
  if (phone && order.customerPhone !== phone) {
    return res.status(403).json({ error: 'Forbidden', message: 'Order does not belong to this phone' });
  }
  res.json(order);
}

async function getOrdersByPhone(req, res) {
  const phone = req.query.phone;
  const orders = await Order.find({ customerPhone: phone, deletedAt: null })
    .sort({ createdAt: -1 })
    .populate('driverId', 'username name')
    .lean();
  res.json(orders);
}

async function addReview(req, res) {
  const { id } = req.params;
  const { rating, comment } = req.body;
  const order = await Order.findOne({ _id: id, deletedAt: null });
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status !== 'delivered') {
    return res.status(400).json({ error: 'Can only review delivered orders' });
  }
  if (order.review && order.review.rating) {
    return res.status(400).json({ error: 'Order already reviewed' });
  }
  order.review = { rating, comment: comment || '' };
  await order.save();
  await Review.findOneAndUpdate(
    { orderId: order._id },
    {
      orderId: order._id,
      driverId: order.driverId,
      rating,
      comment: comment || '',
      customerPhone: order.customerPhone,
      customerName: order.customerName,
    },
    { upsert: true }
  );
  res.json(order);
}

module.exports = { createOrder, getOrderById, getOrdersByPhone, addReview };
