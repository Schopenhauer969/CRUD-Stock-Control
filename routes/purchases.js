const express = require("express");
const router = express.Router();
const Purchase = require("../models/Purchase");
const Inventory = require("../models/Inventory");
const Supplier = require("../models/Supplier");

// ✅ total qty ever purchased (must be BEFORE /:id)
router.get("/stats/purchaseRecord", async (req, res) => {
  try {
    const result = await Purchase.aggregate([
      { $group: { _id: null, totalStockQty: { $sum: "$qty" }, count: { $sum: 1 } } },
    ]);
    res.json({
      totalStockQty: result[0]?.totalStockQty || 0,
      count: result[0]?.count || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all purchases
router.get("/", async (req, res) => {
  try {
    const data = await Purchase.find().sort({ createdAt: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE purchase -> increases inventory stock
router.post("/", async (req, res) => {
  try {
    const { product, supplier, qty, cost, date } = req.body;
    if (!product || !supplier || !qty || qty < 1 || cost === undefined || !date) {
      return res.status(400).json({ error: "Product, supplier, quantity, cost and date are required" });
    }

    const prod = await Inventory.findById(product);
    if (!prod) return res.status(404).json({ error: "Product not found" });
    const sup = await Supplier.findById(supplier);
    if (!sup) return res.status(404).json({ error: "Supplier not found" });

    const purchase = await Purchase.create({
      product,
      productName: prod.name,
      supplier,
      supplierName: sup.name,
      qty,
      cost,
      date,
    });

    prod.stock = (prod.stock || 0) + Number(qty);
    await prod.save();

    res.status(201).json(purchase);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE purchase -> adjusts inventory stock by the delta
router.put("/:id", async (req, res) => {
  try {
    const existing = await Purchase.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Purchase not found" });

    const { product, supplier, qty, cost, date } = req.body;

    // revert stock from old product/qty
    const oldProduct = await Inventory.findById(existing.product);
    if (oldProduct) {
      oldProduct.stock = Math.max(0, (oldProduct.stock || 0) - existing.qty);
      await oldProduct.save();
    }

    const newProduct = await Inventory.findById(product || existing.product);
    const newSupplier = await Supplier.findById(supplier || existing.supplier);
    if (!newProduct) return res.status(404).json({ error: "Product not found" });
    if (!newSupplier) return res.status(404).json({ error: "Supplier not found" });

    existing.product = newProduct._id;
    existing.productName = newProduct.name;
    existing.supplier = newSupplier._id;
    existing.supplierName = newSupplier.name;
    existing.qty = qty ?? existing.qty;
    existing.cost = cost ?? existing.cost;
    existing.date = date ?? existing.date;
    await existing.save();

    newProduct.stock = (newProduct.stock || 0) + Number(existing.qty);
    await newProduct.save();

    res.json(existing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE purchase -> reverts inventory stock
router.delete("/:id", async (req, res) => {
  try {
    const purchase = await Purchase.findByIdAndDelete(req.params.id);
    if (!purchase) return res.status(404).json({ error: "Purchase not found" });

    const prod = await Inventory.findById(purchase.product);
    if (prod) {
      prod.stock = Math.max(0, (prod.stock || 0) - purchase.qty);
      await prod.save();
    }

    res.json({ message: "Purchase deleted", id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
