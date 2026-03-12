const mongoose = require('mongoose');

const pointSchema = new mongoose.Schema({
  label: { type: String, required: true },
  coords: {
    type: [Number], // [lat, lng]
    required: true,
    validate: {
      validator: (v) => Array.isArray(v) && v.length === 2,
      message: 'coords must be [lat, lng]',
    },
  },
}, { _id: false });

const reviewEmbedSchema = new mongoose.Schema({
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: String,
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true }, // human-readable e.g. ORD-1001
  customerPhone: { type: String, required: true },
  customerName: String,
  pickup: { type: pointSchema, required: true },
  delivery: { type: pointSchema, required: true },
  loadSize: {
    type: String,
    required: true,
    enum: ['xsmall', 'small', 'medium', 'large', 'xlarge'],
  },
  unloading: { type: Boolean, default: false },
  price: { type: Number, required: true },
  distanceKm: { type: Number, required: true },
  durationMin: Number,
  status: {
    type: String,
    required: true,
    enum: ['queue', 'process', 'pickedUp', 'delivered', 'cancelled'],
    default: 'queue',
  },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },
  cancelReason: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  review: { type: reviewEmbedSchema, default: null },
  completedAt: Date,
  deletedAt: { type: Date, default: null },
}, {
  timestamps: true,
  toJSON: { virtuals: false, transform: (_, ret) => { delete ret.__v; return ret; } },
});

orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ driverId: 1, status: 1 });
orderSchema.index({ customerPhone: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
