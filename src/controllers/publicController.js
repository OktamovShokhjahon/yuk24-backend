const config = require('../config');
const { calculatePrice, PriceInputError } = require('../utils/pricing');

async function getRoute(req, res) {
  const { start, end } = req.body;
  if (!Array.isArray(start) || start.length < 2 || !Array.isArray(end) || end.length < 2) {
    return res.status(400).json({ error: 'start and end must be [lat, lng] arrays' });
  }
  const [startLat, startLng] = start;
  const [endLat, endLng] = end;

  if (config.orsApiKey) {
    try {
      const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${config.orsApiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coordinates: [[startLng, startLat], [endLng, endLat]],
        }),
      });
      const data = await response.json();
      if (data.routes && data.routes[0]) {
        const r = data.routes[0];
        const distanceKm = (r.summary?.distance ?? 0) / 1000;
        const durationMin = (r.summary?.duration ?? 0) / 60;
        return res.json({
          distanceKm: Math.round(distanceKm * 100) / 100,
          durationMin: Math.round(durationMin),
          geometry: r.geometry,
        });
      }
    } catch (err) {
      console.error('ORS error:', err.message);
    }
  }

  // Fallback: Haversine distance and rough duration (e.g. 30 km/h average in city)
  const R = 6371;
  const dLat = ((endLat - startLat) * Math.PI) / 180;
  const dLng = ((endLng - startLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((startLat * Math.PI) / 180) * Math.cos((endLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;
  const durationMin = Math.round((distanceKm / 30) * 60);
  res.json({
    distanceKm: Math.round(distanceKm * 100) / 100,
    durationMin,
    geometry: null,
  });
}

async function getPrice(req, res) {
  const { distanceKm, loadSize, unloading } = req.body;
  try {
    const price = calculatePrice({ distanceKm, loadSize, unloading });
    res.json({ price });
  } catch (err) {
    if (err instanceof PriceInputError) {
      return res.status(400).json({ error: 'Validation failed', details: [{ message: err.message }] });
    }
    throw err;
  }
}

module.exports = { getRoute, getPrice };
