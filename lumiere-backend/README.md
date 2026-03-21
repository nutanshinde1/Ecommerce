# LUMIÈRE — E-Commerce (Frontend + Backend)

A luxury fashion store with a **zero-dependency Node.js backend** and a fully connected HTML/CSS/JS frontend.

---

## 📁 Project Structure

```
lumiere-backend/
├── server.js           ← Main HTTP server (all routes)
├── package.json
├── db/
│   ├── database.js     ← File-based JSON database layer
│   └── data.json       ← Auto-generated on first run (seed data)
└── public/
    └── index.html      ← Full frontend (HTML + CSS + JS)
```

---

## 🚀 Quick Start

```bash
# 1. Enter the project folder
cd lumiere-backend

# 2. Start the server (no npm install needed!)
node server.js

# 3. Open browser
# http://localhost:3000
```

> Requires **Node.js 18+**. Zero npm dependencies — uses only built-in modules.

---

## 🔐 API Reference

### Auth
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | `{name, email, password}` | Register new user |
| POST | `/api/auth/login` | `{email, password}` | Login → returns token |
| POST | `/api/auth/logout` | — | Invalidate session |
| GET  | `/api/auth/me` | — | Get current user |

### Products
| Method | Endpoint | Query Params | Description |
|--------|----------|--------------|-------------|
| GET | `/api/products` | `?category=Women&search=dress&badge=sale` | List products |
| GET | `/api/products/:id` | — | Single product |
| GET | `/api/products/:id/reviews` | — | Get reviews |
| POST | `/api/products/:id/reviews` | `{rating, comment}` | Add review (auth) |

### Orders
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/api/orders` | — | My orders (auth) |
| POST | `/api/orders` | `{items:[{id,qty}], address, paymentMethod}` | Place order (auth) |
| GET | `/api/orders/:id` | — | Single order (auth) |

### Newsletter
| Method | Endpoint | Body |
|--------|----------|------|
| POST | `/api/newsletter/subscribe` | `{email}` |

### Admin (requires admin role)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/stats` | Revenue, orders, users, subscribers |
| GET | `/api/admin/orders` | All orders |
| GET | `/api/admin/users` | All users |

---

## 👤 Default Admin Account

```
Email:    admin@lumiere.com
Password: admin123
```

---

## 🔑 Authentication

Add token to requests:
```
Authorization: Bearer <token>
```

---

## 💾 Database

The database is a plain `db/data.json` file — no SQL, no MongoDB needed.
It auto-seeds with 8 products and 1 admin user on first run.

---

## 🌐 Deployment

To deploy to any server (VPS, Railway, Render):

```bash
# Set port via environment variable
PORT=8080 node server.js
```

The frontend is served at `/` and the API at `/api/*`.
