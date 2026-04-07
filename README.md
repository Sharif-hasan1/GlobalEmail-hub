# MailStock Market

A modern digital marketplace for buying temporary and aged email accounts (Gmail, Outlook, Yahoo, and more).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router v6, Axios |
| Backend | Node.js, Express.js |
| Database | MongoDB (Mongoose) |
| Auth | JWT (JSON Web Tokens) |
| Styling | Custom CSS (no frameworks) |

---

## Quick Start

### Prerequisites
- Node.js ≥ 18
- MongoDB running locally on `mongodb://localhost:27017`

### 1. Install all dependencies
```bash
npm run install-all
```

### 2. Seed the database (sample products + admin user)
```bash
npm run seed
```

This creates:
- 7 sample products (Gmail, Outlook, Yahoo)
- Admin account: `admin@mailstock.com` / `admin123`

### 3. Run the development servers
```bash
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

---

## Project Structure

```
mailstock-market/
├── backend/
│   ├── config/db.js          MongoDB connection
│   ├── middleware/auth.js     JWT auth middleware
│   ├── middleware/admin.js    Admin role guard
│   ├── models/
│   │   ├── User.js
│   │   ├── Product.js
│   │   └── Order.js
│   ├── routes/
│   │   ├── auth.js            /api/auth
│   │   ├── products.js        /api/products
│   │   ├── orders.js          /api/orders
│   │   └── admin.js           /api/admin
│   ├── seed.js                Sample data seeder
│   └── server.js
│
└── frontend/src/
    ├── context/
    │   ├── AuthContext.jsx    Auth state (login, register, logout)
    │   └── CartContext.jsx    Cart state (add, remove, persist)
    ├── components/
    │   ├── Header.jsx         Sticky responsive navbar
    │   ├── Footer.jsx         Site footer
    │   ├── ProductRow.jsx     Marketplace product list row
    │   └── CartSidebar.jsx    Slide-in cart panel
    └── pages/
        ├── Home.jsx           Hero + featured products
        ├── Products.jsx       Full product list with search/filter
        ├── Login.jsx
        ├── Register.jsx
        ├── Orders.jsx         User order history
        ├── Support.jsx        FAQ + contact form
        ├── Checkout.jsx       Order confirmation
        └── admin/
            └── AdminPanel.jsx Dashboard, products CRUD, orders
```

---

## API Endpoints

### Auth
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user (auth required) |

### Products
| Method | Route | Description |
|---|---|---|
| GET | `/api/products` | List active products (supports `?search=` & `?category=`) |
| GET | `/api/products/categories` | Get unique categories |
| GET | `/api/products/:id` | Single product |

### Orders
| Method | Route | Description |
|---|---|---|
| POST | `/api/orders` | Place order (auth required) |
| GET | `/api/orders/my` | User's own orders (auth required) |

### Admin (auth + admin role required)
| Method | Route | Description |
|---|---|---|
| GET | `/api/admin/stats` | Dashboard stats |
| GET/POST | `/api/admin/products` | List / create products |
| PUT/DELETE | `/api/admin/products/:id` | Update / delete product |
| GET | `/api/admin/orders` | All orders |
| PUT | `/api/admin/orders/:id` | Update order status |

---

## Environment Variables

Copy `backend/.env` and update for production:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/mailstock
JWT_SECRET=your_strong_secret_here
```

---

## Features

- **Product marketplace** — Icon, title, description, stock counter, price, buy button
- **Search & category filters** — Instant front-end filtering
- **Cart system** — Persisted in localStorage, slide-in sidebar
- **Checkout** — Authenticated order placement with stock deduction
- **Order history** — Expandable order rows with item details
- **Auth system** — JWT-based login/register, protected routes
- **Admin panel** — Dashboard stats, product CRUD (with image upload), order management
- **Responsive design** — Mobile-first, works on all screen sizes
- **Sticky header + Footer links** — ToS, Privacy, Refund, Contact
