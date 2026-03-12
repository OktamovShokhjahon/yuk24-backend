const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const driverSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  active: { type: Boolean, default: true },
  name: String,
  phone: String,
  vehicleInfo: String,
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: { type: [Number], default: [0, 0] }, // [lng, lat] for GeoJSON
  },
  lastSeenAt: Date,
  deletedAt: { type: Date, default: null },
}, {
  timestamps: true,
  toJSON: { virtuals: false, transform: (_, ret) => { delete ret.passwordHash; delete ret.__v; return ret; } },
});

driverSchema.index({ active: 1, lastSeenAt: -1 });

driverSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

module.exports = mongoose.model('Driver', driverSchema);
