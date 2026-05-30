# YUK 24 — Backend API

REST API backend for **YUK 24** on-demand cargo delivery. Built with Node.js, Express.js, and MongoDB (Mongoose).

## Requirements

- **Node.js** LTS (v18+)
- **MongoDB** (local or Atlas)
- **npm** or yarn

## Setup

1. **Clone and install**

   ```bash
   cd yuk24-backend
   npm install
   ```

2. **Environment**

   Copy `.env.example` to `.env` and set your values:

   ```bash
   cp .env.example .env
   ```

   Main variables:

   | Variable           | Description                    | Default (if omitted)     |
   |--------------------|--------------------------------|---------------------------|
   | `PORT`             | Server port                    | `5000`                    |
   | `MONGODB_URI`      | MongoDB connection string      | `mongodb://localhost:27017/yuk24` |
   | `JWT_SECRET`       | Secret for JWT signing         | (set in production)       |
   | `JWT_EXPIRY`       | Token expiry (e.g. `7d`)       | `7d`                      |
   | `ADMIN_USERNAME`   | Default admin username         | `admin`                   |
   | `ADMIN_PASSWORD`   | Default admin password (MVP)   | `admin123`                |
   | `VITE_APP_URL`     | Frontend origin for CORS       | `*`                       |
   | `ORS_API_KEY`      | OpenRouteService API key (optional) | —                    |

3. **Run**

   ```bash
   npm run dev
   ```

   Or production:

   ```bash
   npm start
   ```

   API base URL: `http://localhost:5000` (or your `PORT`).

## Main endpoints

### Public

- `GET  /api/health` — Health check (DB status).
- `POST /api/route` — Body: `{ start: [lat, lng], end: [lat, lng] }` → `{ distanceKm, durationMin, geometry? }`. Uses ORS if `ORS_API_KEY` is set; otherwise Haversine fallback.
- `POST /api/price` — Body: `{ distanceKm, loadSize, unloading }` → `{ price }`. Server-side pricing (single source of truth), UZS: `(10000 + distanceKm * 3000) * loadMultiplier + (unloading ? 20000 : 0)`, where the multiplier (xsmall=1.0, small=1.2, medium=1.5, large=2.0, xlarge=2.5) applies to base + distance fee and the 20000 unloading fee is added after, rounded to a whole UZS.

### Auth

- `POST /api/auth/admin/login` — Body: `{ username, password }` → `{ token, user }`. Default: `admin` / `admin123`.
- `POST /api/auth/driver/login` — Body: `{ username, password }` → `{ token, user }`. Requires driver to be active.

Use the token in the `Authorization` header: `Bearer <token>`.

### Customer (orders)

- `POST /api/orders` — Create order (phone, pickup, delivery, loadSize, unloading, price, distanceKm, durationMin, customerName?).
- `GET  /api/orders/by-phone?phone=...` — List orders for a phone number.
- `GET  /api/orders/:id` — Order details (optional `?phone=...` to restrict to owner).
- `POST /api/orders/:id/review` — Body: `{ rating, comment }` (only when status is `delivered`).

### Driver (require `Authorization: Bearer <driver_token>`)

- `GET  /api/driver/orders/available` — List orders with status `queue`.
- `POST /api/driver/orders/:id/accept` — Accept order (sets driver, status → `process`).
- `POST /api/driver/orders/:id/cancel` — Body: `{ reason? }` → status `cancelled`.
- `POST /api/driver/orders/:id/picked-up` — Status → `pickedUp`.
- `POST /api/driver/orders/:id/delivered` — Body: `{ completedAt? }` → status `delivered`.
- `GET  /api/driver/me` — Current driver profile + stats.
- `PATCH /api/driver/location` — Body: `{ lat, lng }` — Update current location and `lastSeenAt`.

### Admin (require `Authorization: Bearer <admin_token>`)

- `GET  /api/admin/stats` — totalOrders, completedOrders, revenue, activeDrivers, totalDrivers.
- `GET  /api/admin/orders` — List orders (query: `page`, `limit`, `status`, `search`, `dateFrom`, `dateTo`).
- `GET  /api/admin/orders/:id` — Order details.
- `GET  /api/admin/drivers` — List drivers with stats.
- `GET  /api/admin/drivers/:id` — Driver detail + orders + reviews.
- `POST /api/admin/drivers` — Create driver (username, password, active, name?, phone?, vehicleInfo?).
- `PATCH /api/admin/drivers/:id` — Update driver.
- `DELETE /api/admin/drivers/:id` — Soft-deactivate driver.
- `GET  /api/admin/charts/orders?days=30` — Orders count per day.
- `GET  /api/admin/charts/revenue?days=30` — Revenue per day.

## Project structure

```
src/
  config/       — App config, DB connection
  models/       — Mongoose models (User, Driver, Admin, Order, Review)
  middleware/   — Auth, validation, rate limit, error handler
  controllers/  — Request handlers
  routes/       — Express routers
  validators/   — express-validator rules
  utils/        — e.g. pricing
  app.js        — Express app
  server.js     — Entry point
```

## Security

- **Helmet** for security headers.
- **CORS** configurable via `VITE_APP_URL`.
- **Rate limiting** on auth and general API.
- **JWT** for admin and driver auth; use strong `JWT_SECRET` in production.
- In production, store admin password hashed (or use env `ADMIN_PASSWORD_HASH`) and avoid default credentials.

## Optional

- **Postman/Insomnia**: Import endpoints from the list above; use env for `BASE_URL` and `ADMIN_TOKEN` / `DRIVER_TOKEN`.
- **OpenAPI**: Can be added later for a formal spec.
# yuk24-backend
