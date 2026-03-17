# KriloxHub Pharma Hub – Backend API

A complete REST API backend for the **KriloxHub Pharma Distribution** website, built with **Node.js + Express + SQLite (better-sqlite3)**.

---

## 🚀 Quick Start

```bash
# 1. Navigate into the backend folder
cd backend

# 2. Install dependencies
npm install

# 3. Seed the database with demo data
npm run seed

# 4. Start the development server
npm run dev
```

The server starts at **http://localhost:5000**

---

## 🔑 Default Credentials (after seeding)

| Role           | Email                  | Password           |
| -------------- | ---------------------- | ------------------ |
| Superintendent | `admin@krilox.com`     | `Admin@Krilox2026` |
| Staff (any)    | `jane@krilox.com` etc. | `Staff@2026`       |

---

## 📁 Project Structure

```
backend/
├── .env                     # Environment variables
├── .env.example             # Template (commit this, not .env)
├── package.json
├── data/                    # SQLite database (auto-created)
│   └── kriloxhub.db
└── src/
    ├── server.js            # Entry point – Express app
    ├── config/
    │   ├── database.js      # SQLite setup & schema
    │   └── jwt.js           # JWT sign/verify helpers
    ├── middleware/
    │   ├── auth.js          # requireAuth + requireRole guards
    │   ├── errorHandler.js  # Global error & 404 handlers
    │   └── validate.js      # express-validator wrapper
    ├── routes/
    │   ├── auth.js          # /api/auth/*
    │   ├── products.js      # /api/products/*
    │   ├── orders.js        # /api/orders/*
    │   ├── payments.js      # /api/payments/*
    │   ├── consultations.js # /api/consultations/*
    │   ├── staff.js         # /api/staff/*
    │   ├── newsletter.js    # /api/newsletter/*
    │   └── dashboard.js     # /api/dashboard/*
    └── scripts/
        └── seed.js          # Database seeding script
```

---

## 📡 API Reference

> All authenticated endpoints require the header:
> `Authorization: Bearer <token>`

### Auth `/api/auth`

| Method | Path               | Auth | Description                 |
| ------ | ------------------ | ---- | --------------------------- |
| POST   | `/login`           | ❌   | Login and receive JWT token |
| GET    | `/me`              | ✅   | Get current user profile    |
| POST   | `/change-password` | ✅   | Update own password         |

**Login request body:**

```json
{ "email": "admin@krilox.com", "password": "Admin@Krilox2026" }
```

---

### Products `/api/products`

| Method | Path         | Auth           | Description                     |
| ------ | ------------ | -------------- | ------------------------------- |
| GET    | `/`          | ❌             | List products (supports filter) |
| GET    | `/:id`       | ❌             | Get single product              |
| POST   | `/`          | superintendent | Create new product              |
| PUT    | `/:id`       | staff+         | Update product details          |
| DELETE | `/:id`       | superintendent | Soft-delete product             |
| PATCH  | `/:id/stock` | staff+         | Adjust stock (delta)            |

**Filter products:** `GET /api/products?category=antibiotics&search=amox&minPrice=1000&maxPrice=5000`

---

### Orders `/api/orders`

| Method | Path           | Auth           | Description                        |
| ------ | -------------- | -------------- | ---------------------------------- |
| POST   | `/`            | ❌             | Place a new customer order         |
| GET    | `/`            | staff+         | List orders (filterable by status) |
| GET    | `/:id`         | staff+         | Get order details                  |
| PATCH  | `/:id/status`  | staff+         | Update order status                |
| PATCH  | `/:id/payment` | staff+         | Update payment status              |
| DELETE | `/:id`         | superintendent | Cancel order                       |

**Order statuses:** `pending`, `confirmed`, `processing`, `delivered`, `cancelled`

---

### Payments `/api/payments`

| Method | Path          | Auth   | Description                          |
| ------ | ------------- | ------ | ------------------------------------ |
| POST   | `/`           | ❌     | Log a payment (customer self-report) |
| GET    | `/`           | staff+ | List all payments                    |
| GET    | `/:id`        | staff+ | Payment details                      |
| PATCH  | `/:id/verify` | staff+ | Verify payment (marks order as paid) |
| PATCH  | `/:id/reject` | staff+ | Reject payment                       |

---

### Consultations `/api/consultations`

| Method | Path          | Auth           | Description                       |
| ------ | ------------- | -------------- | --------------------------------- |
| POST   | `/`           | ❌             | Submit telemedicine form          |
| GET    | `/`           | staff+         | List consultations                |
| GET    | `/:id`        | staff+         | Get consultation detail           |
| PATCH  | `/:id/status` | staff+         | Update status / assign pharmacist |
| DELETE | `/:id`        | superintendent | Delete consultation record        |

**Statuses:** `pending`, `in_review`, `completed`, `rejected`

---

### Staff `/api/staff`

| Method | Path            | Auth           | Description            |
| ------ | --------------- | -------------- | ---------------------- |
| GET    | `/`             | superintendent | List all staff         |
| GET    | `/:id`          | superintendent | Staff profile          |
| POST   | `/`             | superintendent | Create staff account   |
| PATCH  | `/:id/status`   | superintendent | Toggle staff status    |
| DELETE | `/:id`          | superintendent | Remove staff account   |
| POST   | `/requests`     | staff+         | Submit supply request  |
| GET    | `/requests`     | staff+         | List supply requests   |
| PATCH  | `/requests/:id` | superintendent | Approve / Deny request |

---

### Newsletter `/api/newsletter`

| Method | Path   | Auth           | Description       |
| ------ | ------ | -------------- | ----------------- |
| POST   | `/`    | ❌             | Subscribe email   |
| GET    | `/`    | superintendent | List subscribers  |
| DELETE | `/:id` | superintendent | Remove subscriber |

---

### Dashboard `/api/dashboard`

| Method | Path       | Auth           | Description                        |
| ------ | ---------- | -------------- | ---------------------------------- |
| GET    | `/kpis`    | staff+         | Key performance indicators         |
| GET    | `/summary` | superintendent | Full management summary (all data) |

---

### Health `/api/health`

```
GET /api/health
```

Returns server status, version, environment, and timestamp. No auth required.

---

## 🌐 Connecting the Frontend

Add this to your HTML or `script.js` to call the API:

```javascript
const API = "http://localhost:5000/api";

// Example: Submit consultation form
async function submitConsultation(data) {
  const response = await fetch(`${API}/consultations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return response.json();
}

// Example: Login
async function login(email, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data.token) localStorage.setItem("krilox_token", data.token);
  return data;
}

// Authenticated request helper
async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("krilox_token");
  return fetch(`${API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  }).then((r) => r.json());
}
```

---

## 🛡️ Security Features

- **JWT Authentication** — 8-hour expiring tokens
- **Role-Based Access Control** — `superintendent` > `staff` > public
- **Password Hashing** — bcrypt with 12 salt rounds
- **Rate Limiting** — 200 req/15 min globally, 20 req/15 min on auth routes
- **Input Validation** — express-validator on all POST/PATCH endpoints
- **SQL Injection Protection** — prepared statements (better-sqlite3)
- **Helmet.js** — secure HTTP headers
- **CORS** — configurable allowed origins

---

## 📦 Tech Stack

| Package            | Purpose                       |
| ------------------ | ----------------------------- |
| express            | HTTP server & routing         |
| better-sqlite3     | Embedded SQLite database      |
| bcryptjs           | Password hashing              |
| jsonwebtoken       | JWT creation & verification   |
| express-validator  | Request body validation       |
| helmet             | Secure HTTP headers           |
| cors               | Cross-Origin Resource Sharing |
| express-rate-limit | API rate limiting             |
| morgan             | HTTP request logging          |
| uuid               | Unique ID generation          |
| dotenv             | Environment variable loading  |
| nodemon            | Auto-reload in development    |
