/**
 * Seed script — populates the Cosmetics database with starter data.
 * Run with: npm run seed
 * Safe to re-run: it wipes the 5 collections first, then reloads them.
 */
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const connectDB = require("../config/db");

const Category = require("../models/Category");
const Supplier = require("../models/Supplier");
const Inventory = require("../models/Inventory");
const Purchase = require("../models/Purchase");
const Sale = require("../models/Sale");

function readJSON(file) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, file), "utf-8"));
}

async function run() {
  await connectDB();

  console.log("🧹 Clearing existing collections...");
  await Promise.all([
    Category.deleteMany({}),
    Supplier.deleteMany({}),
    Inventory.deleteMany({}),
    Purchase.deleteMany({}),
    Sale.deleteMany({}),
  ]);

  console.log("🌱 Seeding categories...");
  const categories = await Category.insertMany(readJSON("categories.json"));
  const catByName = Object.fromEntries(categories.map((c) => [c.name, c._id]));

  console.log("🌱 Seeding suppliers...");
  const suppliers = await Supplier.insertMany(readJSON("suppliers.json"));
  const supByName = Object.fromEntries(suppliers.map((s) => [s.name, s._id]));

  console.log("🌱 Seeding inventory...");
  const invRaw = readJSON("inventory.json").map((i) => ({
    name: i.name,
    barcode: i.barcode,
    category: catByName[i.categoryName] || null,
    costPrice: i.costPrice,
    sellPrice: i.sellPrice,
    stock: i.stock,
  }));
  const inventory = await Inventory.insertMany(invRaw);
  const invByName = Object.fromEntries(inventory.map((i) => [i.name, i]));

  console.log("🌱 Seeding purchases (and increasing stock)...");
  const purchasesRaw = readJSON("purchases.json");
  for (const p of purchasesRaw) {
    const prod = invByName[p.productName];
    const sup = supByName[p.supplierName];
    if (!prod || !sup) continue;
    await Purchase.create({
      product: prod._id,
      productName: prod.name,
      supplier: sup,
      supplierName: p.supplierName,
      qty: p.qty,
      cost: p.cost,
      date: p.date,
    });
    prod.stock += p.qty;
    await prod.save();
  }

  console.log("🌱 Seeding sales (and decreasing stock)...");
  const salesRaw = readJSON("sales.json");
  for (const s of salesRaw) {
    const prod = invByName[s.productName];
    if (!prod) continue;
    const total = s.qty * s.price;
    await Sale.create({
      customerName: s.customerName,
      product: prod._id,
      productName: prod.name,
      qty: s.qty,
      price: s.price,
      total,
      date: s.date,
    });
    prod.stock = Math.max(0, prod.stock - s.qty);
    await prod.save();
  }

  console.log("✅ Seed complete!");
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
