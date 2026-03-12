const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config');
const { Admin, Driver } = require('../models');

function signToken(payload) {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiry });
}

async function ensureAdminExists() {
  const count = await Admin.countDocuments();
  if (count === 0) {
    const hash = await bcrypt.hash(config.admin.password, 10);
    await Admin.create({ username: config.admin.username, passwordHash: hash });
    console.log('Default admin created:', config.admin.username);
  }
}

async function adminLogin(req, res) {
  const { username, password } = req.body;
  await ensureAdminExists();
  const admin = await Admin.findOne({ username });
  if (!admin || !(await admin.comparePassword(password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = signToken({ id: admin._id.toString(), role: 'admin' });
  return res.json({ token, user: { id: admin._id, username: admin.username, role: 'admin' } });
}

async function driverLogin(req, res) {
  const { username, password } = req.body;
  const driver = await Driver.findOne({ username, deletedAt: null });
  if (!driver || !(await driver.comparePassword(password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  if (!driver.active) {
    return res.status(403).json({ error: 'Account inactive', message: 'Driver account is deactivated' });
  }
  const token = signToken({ id: driver._id.toString(), role: 'driver' });
  return res.json({
    token,
    user: {
      id: driver._id,
      username: driver.username,
      name: driver.name,
      active: driver.active,
      role: 'driver',
    },
  });
}

module.exports = { adminLogin, driverLogin, signToken, ensureAdminExists };
