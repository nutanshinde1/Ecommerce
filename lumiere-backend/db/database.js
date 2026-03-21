/**
 * LUMIÈRE — File-based JSON Database
 * Simulates a real DB with users, products, orders, cart, reviews tables
 */

const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, 'data.json');

// ── Seed Data ──────────────────────────────────────────────────
const SEED = {
  users: [
    {
      id: 'u1',
      name: 'Admin User',
      email: 'admin@lumiere.com',
      // password: admin123  (sha256 hashed)
      passwordHash: crypto.createHash('sha256').update('admin123').digest('hex'),
      role: 'admin',
      createdAt: new Date().toISOString()
    }
  ],
  products: [
    { id:'p1', name:'Silk Wrap Dress',    category:'Women',      sub:'Women · Dresses',    price:4999, oldPrice:7999, rating:5, reviews:24, badge:'sale',  emoji:'👗', stock:15, description:'Luxuriously soft silk wrap dress with a flattering silhouette. Perfect for evenings out.' },
    { id:'p2', name:'Cashmere Blazer',    category:'Men',        sub:'Men · Formals',      price:8499, oldPrice:null, rating:5, reviews:18, badge:'new',   emoji:'🧥', stock:8,  description:'Premium cashmere blazer with a structured fit. Timeless and versatile.' },
    { id:'p3', name:'Leather Tote',       category:'Accessories',sub:'Accessories · Bags', price:5999, oldPrice:null, rating:4, reviews:31, badge:null,    emoji:'👜', stock:20, description:'Hand-stitched full-grain leather tote. Roomy, durable and beautifully crafted.' },
    { id:'p4', name:'Block Heel Mule',    category:'Footwear',   sub:'Women · Footwear',   price:3299, oldPrice:4999, rating:5, reviews:12, badge:'sale',  emoji:'👠', stock:10, description:'Elegant block heel mule in supple leather. Comfortable enough for all-day wear.' },
    { id:'p5', name:'Gold Choker Set',    category:'Jewellery',  sub:'Jewellery · Necklace',price:2799,oldPrice:null, rating:5, reviews:9,  badge:'new',   emoji:'📿', stock:25, description:'Delicate 22k gold-plated choker set with matching earrings.' },
    { id:'p6', name:'Linen Shirt',        category:'Men',        sub:'Men · Casuals',      price:1899, oldPrice:2499, rating:4, reviews:44, badge:'sale',  emoji:'👔', stock:30, description:'Breathable linen shirt in a relaxed fit. Ideal for warm days.' },
    { id:'p7', name:'Scented Candle Set', category:'Home',       sub:'Home · Decor',       price:1499, oldPrice:null, rating:5, reviews:37, badge:'new',   emoji:'🕯', stock:50, description:'Set of 3 hand-poured soy candles in amber, sandalwood and jasmine.' },
    { id:'p8', name:'Structured Handbag', category:'Accessories',sub:'Women · Bags',       price:6999, oldPrice:null, rating:5, reviews:16, badge:null,    emoji:'👝', stock:12, description:'Architectural structured handbag with gold-tone hardware and suede lining.' },
  ],
  orders: [],
  reviews: [],
  subscribers: [],
  sessions: {}
};

// ── Init DB ────────────────────────────────────────────────────
function init() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(SEED, null, 2));
    console.log('[DB] Database initialized with seed data');
  }
}

function read() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function write(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ── Generic Helpers ────────────────────────────────────────────
const db = {
  // Products
  getProducts: (filter = {}) => {
    const data = read();
    let list = data.products;
    if (filter.category) list = list.filter(p => p.category === filter.category);
    if (filter.search)   list = list.filter(p =>
      p.name.toLowerCase().includes(filter.search.toLowerCase()) ||
      p.sub.toLowerCase().includes(filter.search.toLowerCase())
    );
    if (filter.badge)    list = list.filter(p => p.badge === filter.badge);
    return list;
  },
  getProduct: (id) => read().products.find(p => p.id === id),
  updateStock: (id, qty) => {
    const data = read();
    const p = data.products.find(x => x.id === id);
    if (p) { p.stock -= qty; write(data); }
  },

  // Users
  getUser: (email) => read().users.find(u => u.email === email),
  getUserById: (id) => read().users.find(u => u.id === id),
  createUser: (user) => {
    const data = read();
    data.users.push(user);
    write(data);
    return user;
  },

  // Sessions (token-based)
  createSession: (userId, token) => {
    const data = read();
    data.sessions[token] = { userId, createdAt: new Date().toISOString() };
    write(data);
  },
  getSession: (token) => {
    const data = read();
    return data.sessions[token];
  },
  deleteSession: (token) => {
    const data = read();
    delete data.sessions[token];
    write(data);
  },

  // Orders
  createOrder: (order) => {
    const data = read();
    data.orders.push(order);
    write(data);
    return order;
  },
  getOrders: (userId) => {
    const data = read();
    return userId
      ? data.orders.filter(o => o.userId === userId)
      : data.orders;
  },
  getOrder: (id) => read().orders.find(o => o.id === id),

  // Reviews
  addReview: (review) => {
    const data = read();
    data.reviews.push(review);
    // Update product rating
    const productReviews = data.reviews.filter(r => r.productId === review.productId);
    const avg = productReviews.reduce((s,r) => s + r.rating, 0) / productReviews.length;
    const product = data.products.find(p => p.id === review.productId);
    if (product) { product.rating = Math.round(avg); product.reviews = productReviews.length; }
    write(data);
    return review;
  },
  getReviews: (productId) => read().reviews.filter(r => r.productId === productId),

  // Newsletter
  subscribe: (email) => {
    const data = read();
    if (!data.subscribers.includes(email)) {
      data.subscribers.push(email);
      write(data);
      return true;
    }
    return false;
  },

  // Stats (admin)
  getStats: () => {
    const data = read();
    const totalRevenue = data.orders
      .filter(o => o.status !== 'cancelled')
      .reduce((s,o) => s + o.total, 0);
    return {
      totalUsers:    data.users.filter(u => u.role !== 'admin').length,
      totalOrders:   data.orders.length,
      totalRevenue,
      totalProducts: data.products.length,
      totalSubscribers: data.subscribers.length,
      recentOrders:  data.orders.slice(-5).reverse()
    };
  }
};

module.exports = { init, db };
