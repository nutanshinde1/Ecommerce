# LUMIERE — Full-Stack E-Commerce Website

> A luxury fashion store built with pure HTML/CSS/JS frontend and a zero-dependency Node.js backend.

---

## Table of Contents

- [Overview](#overview)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Frontend Features](#frontend-features)
- [Backend Architecture](#backend-architecture)
- [API Reference](#api-reference)
- [Database](#database)
- [Authentication](#authentication)
- [Admin Dashboard](#admin-dashboard)
- [Deployment](#deployment)
- [Default Credentials](#default-credentials)
- [Tech Stack](#tech-stack)

---

## Overview

LUMIÈRE is a complete e-commerce web application for a luxury fashion brand. It includes a fully styled, responsive frontend and a Node.js HTTP backend with persistent JSON-based storage — **no npm installs required**.

The frontend gracefully falls back to embedded product data when the backend is not running, making it usable standalone as well.

---

## Project Structure

```
lumiere-backend/
│
├── server.js               ← Main HTTP server (all API routes + static file serving)
├── package.json            ← Project metadata and run scripts
├── README.md               ← This file
│
├── db/
│   ├── database.js         ← Database abstraction layer (read/write JSON)
│   └── data.json           ← Auto-generated on first run with seed data
│
└── public/
    └── index.html          ← Complete frontend (HTML + CSS + JavaScript)
```

---

## Getting Started

### Prerequisites

- **Node.js v18 or higher** — [Download here](https://nodejs.org)
- No other dependencies needed

### Installation & Run

```bash
# 1. Unzip the project
unzip lumiere-ecommerce.zip
cd lumiere-backend

# 2. Start the server
node server.js

# 3. Open in your browser
# http://localhost:3000
```

The database (`db/data.json`) is created automatically on first run with 8 products and an admin user.

### Development Mode (auto-restart on file change)

```bash
node --watch server.js
```

---
## 🎥 Demo Video

▶️ Click below to watch:

https://github.com/nutanshinde1/Ecommerce/blob/main/Demo.mp4

## Frontend Features

| Feature | Description |
|---|---|
| Hero Section | Full-screen split hero with seasonal sale badge |
| Category Filter | Click any category to filter the product grid via API |
| Product Grid | 8 products with badges, stock indicators, hover actions |
| Live Search | Debounced search input calls `/api/products?search=...` |
| Cart Sidebar | Add, remove, adjust quantity; persisted in localStorage |
| Wishlist | Toggle per product; persisted in localStorage |
| Login / Register | Modal-based auth flows connected to the backend |
| My Orders | View past orders in the account panel |
| Checkout | Places a real order via `POST /api/orders` (requires login) |
| Admin Panel | Stats dashboard for admin users |
| Newsletter | Subscribes email via `POST /api/newsletter/subscribe` |
| Responsive Design | Mobile-friendly with hamburger menu and stacked layouts |
| Offline Fallback | Works with embedded product data if backend is unreachable |

---

## Backend Architecture

The backend is a single `server.js` file using **only Node.js built-in modules**:

- `http` — HTTP server
- `url` — URL and query string parsing
- `fs` — File system (database read/write)
- `path` — File path utilities
- `crypto` — Password hashing (SHA-256) and token generation

### Request Flow

```
Browser Request
      │
      ▼
  server.js  ──── OPTIONS? ──── CORS Preflight Response
      │
      ├── /api/*  ──── Route Handler ──── db/database.js ──── db/data.json
      │
      └── /*      ──── Static File Server ──── public/index.html
```

### Security

- Passwords are hashed using SHA-256 before storage
- Sessions use cryptographically random 64-character tokens
- Bearer token authentication on protected routes
- Directory traversal prevention on static file serving

---

## API Reference

All API responses follow this format:

```json
{ "success": true, ...data }
{ "success": false, "error": "Error message" }
```

### Authentication

| Method | Endpoint | Body | Auth | Description |
|--------|----------|------|------|-------------|
| POST | `/api/auth/register` | `{ name, email, password }` | No | Register a new user |
| POST | `/api/auth/login` | `{ email, password }` | No | Login and receive a token |
| POST | `/api/auth/logout` | — | Yes | Invalidate session token |
| GET | `/api/auth/me` | — | Yes | Get current user profile |

**Example — Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lumiere.com","password":"admin123"}'
```

**Response:**
```json
{
  "success": true,
  "token": "a3f8c2...",
  "user": { "id": "u1", "name": "Admin User", "email": "admin@lumiere.com", "role": "admin" }
}
```

---

### Products

| Method | Endpoint | Query Params | Auth | Description |
|--------|----------|--------------|------|-------------|
| GET | `/api/products` | `category`, `search`, `badge` | No | List products with optional filters |
| GET | `/api/products/:id` | — | No | Get a single product by ID |
| GET | `/api/products/:id/reviews` | — | No | Get reviews for a product |
| POST | `/api/products/:id/reviews` | `{ rating, comment }` | Yes | Add a review |

**Example — Filter by category:**
```bash
curl "http://localhost:3000/api/products?category=Women"
```

**Example — Search:**
```bash
curl "http://localhost:3000/api/products?search=blazer"
```

**Example — Add a review:**
```bash
curl -X POST http://localhost:3000/api/products/p1/reviews \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rating":5,"comment":"Absolutely stunning quality!"}'
```

---

### Orders

| Method | Endpoint | Body | Auth | Description |
|--------|----------|------|------|-------------|
| GET | `/api/orders` | — | Yes | Get orders for current user |
| POST | `/api/orders` | `{ items, address, paymentMethod }` | Yes | Place a new order |
| GET | `/api/orders/:id` | — | Yes | Get a specific order |

**Example — Place an order:**
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      { "id": "p1", "qty": 1 },
      { "id": "p6", "qty": 2 }
    ],
    "address": "42 Marine Drive, Mumbai 400001",
    "paymentMethod": "upi"
  }'
```

**Order Validation:**
- Each product's stock is checked before the order is confirmed
- If any item has insufficient stock, the entire order is rejected
- Stock is deducted immediately upon confirmation

---

### Newsletter

| Method | Endpoint | Body | Auth | Description |
|--------|----------|------|------|-------------|
| POST | `/api/newsletter/subscribe` | `{ email }` | No | Subscribe an email address |

---

### Admin

All admin routes require a logged-in user with `role: "admin"`.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/stats` | Admin | Revenue, orders, users, subscriber counts |
| GET | `/api/admin/orders` | Admin | All orders across all users |
| GET | `/api/admin/users` | Admin | All registered users |

**Example — Get stats:**
```bash
curl http://localhost:3000/api/admin/stats \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "totalUsers": 3,
  "totalOrders": 7,
  "totalRevenue": 54290,
  "totalProducts": 8,
  "totalSubscribers": 12,
  "recentOrders": [...]
}
```

---

## Database

The database is a plain JSON file at `db/data.json`. No external database software is required.

### Schema

```json
{
  "users":       [...],
  "products":    [...],
  "orders":      [...],
  "reviews":     [...],
  "subscribers": [...],
  "sessions":    { "token": { "userId": "...", "createdAt": "..." } }
}
```

### Seeded Products

| ID | Name | Category | Price |
|----|------|----------|-------|
| p1 | Silk Wrap Dress | Women | ₹4,999 |
| p2 | Cashmere Blazer | Men | ₹8,499 |
| p3 | Leather Tote | Accessories | ₹5,999 |
| p4 | Block Heel Mule | Footwear | ₹3,299 |
| p5 | Gold Choker Set | Jewellery | ₹2,799 |
| p6 | Linen Shirt | Men | ₹1,899 |
| p7 | Scented Candle Set | Home | ₹1,499 |
| p8 | Structured Handbag | Accessories | ₹6,999 |

> To reset the database to its original state, delete `db/data.json` and restart the server.

---

## Authentication

Protected routes require a `Bearer` token in the `Authorization` header:

```
Authorization: Bearer <your_token_here>
```

Tokens are obtained from `/api/auth/login` or `/api/auth/register`. They are stored in `data.json` under `sessions` and remain valid until logout or manual deletion.

**Frontend storage:** The token is saved in `localStorage` as `lumiere_token` and automatically included in all API requests.

---

## Admin Dashboard

Log in with the admin account to access the dashboard panel in the UI:

```
Email:    admin@lumiere.com
Password: admin123
```

The admin panel displays:
- Total revenue from confirmed orders
- Total order count
- Total registered users
- Total newsletter subscribers
- 5 most recent orders with user name, items, total, and timestamp

---

## Deployment

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Port the server listens on |

### Run on a custom port

```bash
PORT=8080 node server.js
```

### Deploy to Railway / Render / Fly.io

1. Upload or push the `lumiere-backend/` folder
2. Set the start command to `node server.js`
3. The server will automatically serve the frontend at `/` and the API at `/api/*`

### Deploy to a Linux VPS

```bash
# Using PM2 for process management
npm install -g pm2
pm2 start server.js --name lumiere
pm2 save
pm2 startup
```

---

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@lumiere.com | admin123 |

> **Important:** Change the admin password in `db/data.json` before deploying to production. The password is stored as a SHA-256 hash.

To generate a new password hash in Node.js:
```javascript
require('crypto').createHash('sha256').update('your_new_password').digest('hex')
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES2020+) |
| Backend | Node.js (built-in `http`, `fs`, `crypto`, `url`, `path`) |
| Database | JSON flat-file (`db/data.json`) |
| Auth | SHA-256 hashed passwords + random session tokens |
| Fonts | Cormorant Garamond + DM Sans (Google Fonts) |
| No dependencies | Zero npm packages required |

---

## License

This project is for personal and educational use.

---

*Built with ✦ by LUMIÈRE*
