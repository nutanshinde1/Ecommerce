/**
 * LUMIÈRE Backend — Node.js HTTP Server (zero npm dependencies)
 * Pure Node.js: http, url, fs, crypto, path
 *
 * Routes:
 *   POST  /api/auth/register
 *   POST  /api/auth/login
 *   POST  /api/auth/logout
 *   GET   /api/auth/me
 *
 *   GET   /api/products
 *   GET   /api/products/:id
 *   GET   /api/products/:id/reviews
 *   POST  /api/products/:id/reviews   [auth]
 *
 *   GET   /api/orders                 [auth]
 *   POST  /api/orders                 [auth]
 *   GET   /api/orders/:id             [auth]
 *
 *   POST  /api/newsletter/subscribe
 *
 *   GET   /api/admin/stats            [admin]
 *   GET   /api/admin/orders           [admin]
 *   GET   /api/admin/users            [admin]
 *
 *   GET   /*  → serves public/index.html (frontend)
 */

const http   = require('http');
const url    = require('url');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const { init, db } = require('./db/database');

const PORT = process.env.PORT || 3000;

// ── Utils ──────────────────────────────────────────────────────

function hash(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

function genToken() {
  return crypto.randomBytes(32).toString('hex');
}

function genId(prefix = '') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); if (body.length > 1e6) reject(new Error('Too large')); });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { resolve({}); }
    });
    req.on('error', reject);
  });
}

function send(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(body);
}

function ok(res, data)     { send(res, 200, { success: true, ...data }); }
function created(res, data){ send(res, 201, { success: true, ...data }); }
function err(res, status, msg) { send(res, status, { success: false, error: msg }); }

// ── Auth Middleware ────────────────────────────────────────────

function authenticate(req) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return null;
  const session = db.getSession(token);
  if (!session) return null;
  const user = db.getUserById(session.userId);
  return user ? { ...user, token } : null;
}

// ── Route Handler ──────────────────────────────────────────────

async function handleRequest(req, res) {
  const parsed   = url.parse(req.url, true);
  const pathname = parsed.pathname;
  const method   = req.method.toUpperCase();
  const query    = parsed.query;

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    res.end();
    return;
  }

  // ── API Routes ───────────────────────────────────────────────

  if (pathname.startsWith('/api/')) {

    // ---- AUTH ----

    if (pathname === '/api/auth/register' && method === 'POST') {
      const body = await readBody(req);
      const { name, email, password } = body;
      if (!name || !email || !password)
        return err(res, 400, 'name, email and password are required');
      if (db.getUser(email))
        return err(res, 409, 'Email already registered');
      const user = db.createUser({
        id: genId('u'), name, email,
        passwordHash: hash(password),
        role: 'customer',
        createdAt: new Date().toISOString()
      });
      const token = genToken();
      db.createSession(user.id, token);
      return created(res, { token, user: safeUser(user) });
    }

    if (pathname === '/api/auth/login' && method === 'POST') {
      const body = await readBody(req);
      const { email, password } = body;
      if (!email || !password) return err(res, 400, 'email and password required');
      const user = db.getUser(email);
      if (!user || user.passwordHash !== hash(password))
        return err(res, 401, 'Invalid credentials');
      const token = genToken();
      db.createSession(user.id, token);
      return ok(res, { token, user: safeUser(user) });
    }

    if (pathname === '/api/auth/logout' && method === 'POST') {
      const user = authenticate(req);
      if (user) db.deleteSession(user.token);
      return ok(res, { message: 'Logged out' });
    }

    if (pathname === '/api/auth/me' && method === 'GET') {
      const user = authenticate(req);
      if (!user) return err(res, 401, 'Unauthorized');
      return ok(res, { user: safeUser(user) });
    }

    // ---- PRODUCTS ----

    if (pathname === '/api/products' && method === 'GET') {
      const products = db.getProducts({
        category: query.category,
        search:   query.search,
        badge:    query.badge
      });
      return ok(res, { products, total: products.length });
    }

    const productMatch = pathname.match(/^\/api\/products\/([^/]+)$/);
    if (productMatch && method === 'GET') {
      const product = db.getProduct(productMatch[1]);
      if (!product) return err(res, 404, 'Product not found');
      return ok(res, { product });
    }

    // Reviews for a product
    const reviewsGetMatch = pathname.match(/^\/api\/products\/([^/]+)\/reviews$/);
    if (reviewsGetMatch && method === 'GET') {
      const reviews = db.getReviews(reviewsGetMatch[1]);
      return ok(res, { reviews });
    }
    if (reviewsGetMatch && method === 'POST') {
      const user = authenticate(req);
      if (!user) return err(res, 401, 'Login to post a review');
      const body = await readBody(req);
      const { rating, comment } = body;
      if (!rating || !comment) return err(res, 400, 'rating and comment required');
      const review = db.addReview({
        id: genId('r'),
        productId: reviewsGetMatch[1],
        userId: user.id,
        userName: user.name,
        rating: Math.min(5, Math.max(1, parseInt(rating))),
        comment,
        createdAt: new Date().toISOString()
      });
      return created(res, { review });
    }

    // ---- ORDERS ----

    if (pathname === '/api/orders' && method === 'GET') {
      const user = authenticate(req);
      if (!user) return err(res, 401, 'Unauthorized');
      const orders = db.getOrders(user.role === 'admin' ? null : user.id);
      return ok(res, { orders });
    }

    if (pathname === '/api/orders' && method === 'POST') {
      const user = authenticate(req);
      if (!user) return err(res, 401, 'Login to place an order');
      const body = await readBody(req);
      const { items, address, paymentMethod } = body;
      if (!items || !items.length) return err(res, 400, 'No items in order');

      // Validate stock and compute total
      let total = 0;
      const enriched = [];
      for (const item of items) {
        const product = db.getProduct(item.id);
        if (!product)          return err(res, 404, `Product ${item.id} not found`);
        if (product.stock < item.qty) return err(res, 400, `Insufficient stock for ${product.name}`);
        enriched.push({ ...item, name: product.name, price: product.price, emoji: product.emoji });
        total += product.price * item.qty;
      }

      // Deduct stock
      for (const item of items) db.updateStock(item.id, item.qty);

      const order = db.createOrder({
        id: genId('ord'),
        userId: user.id,
        userName: user.name,
        items: enriched,
        total,
        address: address || 'N/A',
        paymentMethod: paymentMethod || 'cod',
        status: 'confirmed',
        createdAt: new Date().toISOString()
      });
      return created(res, { order });
    }

    const orderMatch = pathname.match(/^\/api\/orders\/([^/]+)$/);
    if (orderMatch && method === 'GET') {
      const user = authenticate(req);
      if (!user) return err(res, 401, 'Unauthorized');
      const order = db.getOrder(orderMatch[1]);
      if (!order) return err(res, 404, 'Order not found');
      if (order.userId !== user.id && user.role !== 'admin')
        return err(res, 403, 'Forbidden');
      return ok(res, { order });
    }

    // ---- NEWSLETTER ----

    if (pathname === '/api/newsletter/subscribe' && method === 'POST') {
      const body = await readBody(req);
      const { email } = body;
      if (!email || !email.includes('@')) return err(res, 400, 'Valid email required');
      const isNew = db.subscribe(email);
      return ok(res, { message: isNew ? 'Subscribed successfully!' : 'Already subscribed.' });
    }

    // ---- ADMIN ----

    if (pathname === '/api/admin/stats' && method === 'GET') {
      const user = authenticate(req);
      if (!user || user.role !== 'admin') return err(res, 403, 'Admin only');
      return ok(res, db.getStats());
    }

    if (pathname === '/api/admin/orders' && method === 'GET') {
      const user = authenticate(req);
      if (!user || user.role !== 'admin') return err(res, 403, 'Admin only');
      return ok(res, { orders: db.getOrders() });
    }

    if (pathname === '/api/admin/users' && method === 'GET') {
      const user = authenticate(req);
      if (!user || user.role !== 'admin') return err(res, 403, 'Admin only');
      const data = require('./db/database').db;
      const { db: rawDb } = require('./db/database');
      const allUsers = rawDb.getOrders('').length >= 0
        ? JSON.parse(fs.readFileSync(path.join(__dirname, 'db/data.json'))).users.map(safeUser)
        : [];
      return ok(res, { users: allUsers });
    }

    return err(res, 404, 'API endpoint not found');
  }

  // ── Static Files (Frontend) ──────────────────────────────────

  let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);

  // Prevent directory traversal
  if (!filePath.startsWith(path.join(__dirname, 'public'))) {
    return err(res, 403, 'Forbidden');
  }

  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, 'public', 'index.html');
  }

  const ext  = path.extname(filePath);
  const mime = { '.html':'text/html', '.css':'text/css', '.js':'application/javascript',
                 '.json':'application/json', '.png':'image/png', '.ico':'image/x-icon' };
  const contentType = mime[ext] || 'text/plain';

  fs.readFile(filePath, (readErr, content) => {
    if (readErr) { err(res, 500, 'File read error'); return; }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
}

function safeUser(u) {
  const { passwordHash, ...safe } = u;
  return safe;
}

// ── Start ──────────────────────────────────────────────────────

init();
const server = http.createServer(async (req, res) => {
  try {
    await handleRequest(req, res);
  } catch (e) {
    console.error('[ERROR]', e.message);
    err(res, 500, 'Internal server error');
  }
});

server.listen(PORT, () => {
  console.log(`\n✦ LUMIÈRE Backend running at http://localhost:${PORT}`);
  console.log(`  API:      http://localhost:${PORT}/api/products`);
  console.log(`  Frontend: http://localhost:${PORT}/`);
  console.log(`  Admin:    POST /api/auth/login { email:"admin@lumiere.com", password:"admin123" }\n`);
});
