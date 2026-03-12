const mongoose = require('mongoose');

const savedAddressSchema = new mongoose.Schema({
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

const userSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true, index: true },
  phoneCountry: { type: String, default: '' },
  name: String,
  savedAddresses: [savedAddressSchema],
  preferredLanguage: { type: String, default: 'en' },
}, {
  timestamps: true,
  toJSON: { virtuals: false, transform: (_, ret) => { delete ret.__v; return ret; } },
});

module.exports = mongoose.model('User', userSchema);
