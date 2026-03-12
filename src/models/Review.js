const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: String,
  customerName: String,
  customerPhone: String,
}, {
  timestamps: true,
  toJSON: { virtuals: false, transform: (_, ret) => { delete ret.__v; return ret; } },
});

reviewSchema.index({ driverId: 1, createdAt: -1 });
reviewSchema.index({ orderId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
