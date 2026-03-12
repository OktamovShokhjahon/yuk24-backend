const mongoose = require('mongoose');

async function health(req, res) {
  const dbOk = mongoose.connection.readyState === 1;
  res.status(dbOk ? 200 : 503).json({
    ok: dbOk,
    db: dbOk ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
}

module.exports = { health };
