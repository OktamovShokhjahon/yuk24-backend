/**
 * Server-side pricing — single source of truth.
 * Mirrors frontend pricing logic; order creation validates/recomputes here.
 */
const BASE_KM = 5;
const BASE_PRICE = 10;
const PRICE_PER_KM = 2;
const LOAD_MULTIPLIERS = {
  xsmall: 1,
  small: 1.2,
  medium: 1.5,
  large: 2,
  xlarge: 2.5,
};
const UNLOADING_FEE = 5;

function calculatePrice({ distanceKm, loadSize, unloading }) {
  const mult = LOAD_MULTIPLIERS[loadSize] ?? 1;
  const distanceComponent = Math.max(0, distanceKm - BASE_KM) * PRICE_PER_KM + BASE_PRICE;
  let price = distanceComponent * mult;
  if (unloading) price += UNLOADING_FEE;
  return Math.round(price * 100) / 100;
}

module.exports = { calculatePrice, LOAD_MULTIPLIERS, UNLOADING_FEE, BASE_KM, BASE_PRICE, PRICE_PER_KM };
