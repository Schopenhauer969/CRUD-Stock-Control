# Skin Glow Dashboard — Cosmetics Inventory & Selling System

A complete, working full-stack app: **Node.js + Express + MongoDB (Mongoose)** backend with a
plain HTML/CSS/JS frontend. Every page (Categories, Inventory, Suppliers, Purchases, Sales) does
real **Create / Read / Update / Delete** against your MongoDB database — nothing is stored in
`localStorage` anymore.

It also behaves like a real selling system:
- Recording a **Purchase** automatically **increases** the product's stock.
- Recording a **Sale** checks available stock, **decreases** it, and blocks the sale if there
  isn't enough stock.
- Editing or deleting a Purchase/Sale automatically re-adjusts stock so numbers always stay correct.
- The Dashboard shows live totals (income, stock, purchase count, sale count) straight from the DB.

## 1. Requirements

- Node.js 18+
- MongoDB running locally (or a MongoDB Atlas connection string)

## 2. Install

```bash
cd skin-glow-pos
npm install
```

## 3. Configure the database (optional)

By default it connects to `mongodb://127.0.0.1:27017/Cosmetics` — the same database you already
had in Compass (`SETEC/Cosmetics`). To use a different URI (e.g. Atlas), set an environment
variable before starting:

```bash
# macOS/Linux
export MONGO_URI="mongodb://127.0.0.1:27017/Cosmetics"

# Windows (PowerShell)
$env:MONGO_URI="mongodb://127.0.0.1:27017/Cosmetics"
```

## 4. Seed starter data (recommended)

This clears and re-fills the 5 collections (`categories`, `suppliers`, `inventorys`, `purchases`,
`sales`) with realistic sample data so the dashboard isn't empty on first run:

```bash
npm run seed
```

The raw data it inserts lives in `/seed/*.json` — one JSON file per collection
(`categories.json`, `suppliers.json`, `inventory.json`, `purchases.json`, `sales.json`), so you
can open/edit them directly or use them to re-import into Compass.

## 5. Run the app

```bash
npm start
```

Then open **http://localhost:3000**

## How the data flows

```
Category  ──┐
            ├── Inventory (product) ──┬── Purchase (from Supplier) → increases stock
Supplier ───┘                         └── Sale (to Customer)        → decreases stock
```

## API Reference

| Resource | Endpoint | Methods |
|---|---|---|
| Categories | `/api/categories` | GET, POST, GET/:id, PUT/:id, DELETE/:id |
| Suppliers | `/api/suppliers` | GET, POST, GET/:id, PUT/:id, DELETE/:id |
| Inventory | `/api/inventorys` | GET, POST, GET/:id, PUT/:id, DELETE/:id |
| Inventory total stock | `/api/inventorys/stats/totalStock` | GET |
| Purchases | `/api/purchases` | GET, POST, PUT/:id, DELETE/:id |
| Purchase count | `/api/purchases/stats/purchaseRecord` | GET |
| Sales | `/api/sales` | GET, POST, PUT/:id, DELETE/:id |
| Sales total | `/api/sales/stats/totalAmount` | GET |
| Dashboard summary | `/api/dashboard` | GET |

All write endpoints (`POST`/`PUT`) return JSON and validate required fields. Deleting a
Purchase/Sale reverses its stock effect so inventory numbers stay accurate.

## What was fixed from the original project

- `server.js` had two servers pasted together (Express/Mongo **and** a broken Express/MySQL
  block) — rebuilt as one clean Mongo-only server.
- `models/category.js` and `models/supplier.js` never called `mongoose.model(...)`, so those
  collections couldn't actually be used — rewritten and properly exported.
- Routes only had partial `GET`s (no POST/PUT/DELETE anywhere, and `routes/category.js` /
  `routes/supplier.js` were empty files) — full CRUD added for every resource.
- The frontend (`index.js`) was reading/writing `localStorage` instead of calling the API, so
  nothing you did in the UI ever reached MongoDB — rewritten to call the real REST API for every
  action.
- Purchases/Sales didn't touch inventory stock at all — now wired so purchases restock and sales
  deduct stock automatically, with edits/deletes reversing the effect correctly.
