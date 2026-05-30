/**
 * Server-side pricing — single source of truth (all amounts in UZS).
 * Mirrors frontend pricing logic; order creation validates/recomputes here.
 */
const BASE_PRICE = 10000; // flat fare on every order
const PRICE_PER_KM = 3000; // charged from km 0 — no free distance
const UNLOADING_FEE = 20000; // added only when unloading === true
const LOAD_MULTIPLIERS = {
  xsmall: 1.0,
  small: 1.2,
  medium: 1.5,
  large: 2.0,
  xlarge: 2.5,
};

class PriceInputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PriceInputError';
  }
}

function calculatePrice({ distanceKm, loadSize, unloading }) {
  if (typeof distanceKm !== 'number' || !Number.isFinite(distanceKm) || distanceKm < 0) {
    throw new PriceInputError('distanceKm must be a finite non-negative number');
  }
  if (!Object.prototype.hasOwnProperty.call(LOAD_MULTIPLIERS, loadSize)) {
    throw new PriceInputError('loadSize must be one of: xsmall, small, medium, large, xlarge');
  }
  if (typeof unloading !== 'boolean') {
    throw new PriceInputError('unloading must be a boolean');
  }
  const distanceFee = distanceKm * PRICE_PER_KM;
  const preMultSubtotal = BASE_PRICE + distanceFee;
  const unloadingFee = unloading ? UNLOADING_FEE : 0;
  return Math.round(preMultSubtotal * LOAD_MULTIPLIERS[loadSize] + unloadingFee);
}

module.exports = {
  calculatePrice,
  PriceInputError,
  LOAD_MULTIPLIERS,
  BASE_PRICE,
  PRICE_PER_KM,
  UNLOADING_FEE,
};
