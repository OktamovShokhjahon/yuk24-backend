const jwt = require('jsonwebtoken');
const config = require('../config');
const { Admin, Driver } = require('../models');

function getToken(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch {
    return null;
  }
}

async function requireAdmin(req, res, next) {
  const token = getToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.role !== 'admin') {
    return res.status(401).json({ error: 'Unauthorized', message: 'Admin access required' });
  }
  const admin = await Admin.findById(payload.id).lean();
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });
  req.admin = admin;
  req.userId = payload.id;
  next();
}

async function requireDriver(req, res, next) {
  const token = getToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.role !== 'driver') {
    return res.status(401).json({ error: 'Unauthorized', message: 'Driver access required' });
  }
  const driver = await Driver.findOne({ _id: payload.id, deletedAt: null });
  if (!driver) return res.status(401).json({ error: 'Unauthorized' });
  if (!driver.active) return res.status(403).json({ error: 'Forbidden', message: 'Driver account is inactive' });
  req.driver = driver;
  req.driverId = payload.id;
  next();
}

function optionalAuth(req, res, next) {
  const token = getToken(req);
  const payload = token ? verifyToken(token) : null;
  if (payload) {
    req.authPayload = payload;
  }
  next();
}

module.exports = {
  getToken,
  verifyToken,
  requireAdmin,
  requireDriver,
  optionalAuth,
};
