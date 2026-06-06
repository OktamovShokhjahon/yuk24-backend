# Driver Reviews API

List customer reviews written about the **currently logged-in driver**.

## Endpoint

```
GET /api/driver/reviews
```

**Auth:** Required — `Authorization: Bearer <driver_token>`

Obtain a driver token via `POST /api/auth/driver/login`.

---

## Query parameters

| Parameter | Type   | Default | Description                          |
|-----------|--------|---------|--------------------------------------|
| `page`    | number | `1`     | Page number (1-based)                |
| `limit`   | number | `20`    | Items per page (min 1, max 50)       |

---

## Success response — `200 OK`

```json
{
  "reviews": [
    {
      "_id": "665a1b2c3d4e5f6789012345",
      "orderId": {
        "_id": "665a0a1b2c3d4e5f6789012340",
        "orderId": "ORD-1042",
        "completedAt": "2026-06-05T14:30:00.000Z"
      },
      "driverId": "665900112233445566778899",
      "rating": 5,
      "comment": "Fast and careful delivery.",
      "customerName": "Ali",
      "customerPhone": "+998901234567",
      "createdAt": "2026-06-05T15:00:00.000Z",
      "updatedAt": "2026-06-05T15:00:00.000Z"
    }
  ],
  "summary": {
    "avgRating": 4.7,
    "totalReviews": 23
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 23,
    "pages": 2
  }
}
```

### Fields

- **reviews** — Newest first. Each review comes from the `Review` collection (created when a customer submits `POST /api/orders/:id/review` on a delivered order).
- **summary.avgRating** — Average star rating (1–5), rounded to one decimal. `null` if the driver has no reviews yet.
- **summary.totalReviews** — Total number of reviews for this driver (across all pages).
- **pagination** — Standard page metadata.

---

## Error responses

| Status | When |
|--------|------|
| `401`  | Missing/invalid token or non-driver role — `{ "error": "Unauthorized", "message": "Driver access required" }` |
| `403`  | Driver account is inactive — `{ "error": "Forbidden", "message": "Driver account is inactive" }` |

---

## Example usage

### cURL

```bash
curl -s \
  -H "Authorization: Bearer YOUR_DRIVER_JWT" \
  "http://localhost:5000/api/driver/reviews?page=1&limit=10"
```

### JavaScript (fetch)

```javascript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const token = localStorage.getItem('driverToken');

async function fetchDriverReviews(page = 1, limit = 20) {
  const res = await fetch(
    `${API_BASE}/api/driver/reviews?page=${page}&limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to load reviews');
  }

  return res.json();
}

// Usage
const { reviews, summary, pagination } = await fetchDriverReviews(1, 10);
console.log(`Average: ${summary.avgRating} (${summary.totalReviews} reviews)`);
```

### React hook sketch

```javascript
import { useEffect, useState } from 'react';

export function useDriverReviews(page = 1) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchDriverReviews(page)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [page]);

  return { data, loading, error };
}
```

---

## Related endpoints

| Method | Path | Who | Purpose |
|--------|------|-----|---------|
| `POST` | `/api/orders/:id/review` | Customer (no auth) | Submit a review after delivery |
| `GET`  | `/api/driver/me` | Driver | Profile and delivery stats |
| `GET`  | `/api/admin/drivers/:id` | Admin | Driver detail including reviews |

---

## Notes

- Reviews are only created when a customer rates a **delivered** order. One review per order.
- The driver sees reviews for **their own account only**; the JWT identifies the driver — no `driverId` parameter is needed or accepted.
- Use `orderId.orderId` (e.g. `"ORD-1042"`) for display; use `orderId._id` if you need to link to order detail APIs.
