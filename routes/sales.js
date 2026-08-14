const express = require("express");
const router = express.Router();
const Sale = require("../models/Sale");
const Inventory = require("../models/Inventory");

// ✅ total revenue from all sales (must be BEFORE /:id)
router.get("/stats/totalAmount", async (req, res) => {
  try {
    const result = await Sale.aggregate([
      { $group: { _id: null, totalAmount: { $sum: "$total" }, count: { $sum: 1 } } },
    ]);
    res.json({
      totalAmount: result[0]?.totalAmount || 0,
      count: result[0]?.count || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all sales
router.get("/", async (req, res) => {
  try {
    const data = await Sale.find().sort({ createdAt: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE sale -> validates stock then deducts it (this is the actual "selling" action)
router.post("/", async (req, res) => {
  try {
    const { customerName, product, qty, price, date } = req.body;
    if (!customerName || !product || !qty || qty < 1 || price === undefined || !date) {
      return res.status(400).json({ error: "Customer, product, quantity, price and date are required" });
    }

    const prod = await Inventory.findById(product);
    if (!prod) return res.status(404).json({ error: "Product not found" });
    if (prod.stock < qty) {
      return res.status(400).json({ error: `Not enough stock. Available: ${prod.stock}` });
    }

    const total = Number(price) * Number(qty);

    const sale = await Sale.create({
      customerName: customerName.trim(),
      product,
      productName: prod.name,
      qty,
      price,
      total,
      date,
    });

    prod.stock -= Number(qty);
    await prod.save();

    res.status(201).json(sale);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE sale -> reverts old stock, validates & applies new stock
router.put("/:id", async (req, res) => {
  try {
    const existing = await Sale.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Sale not found" });

    const { customerName, product, qty, price, date } = req.body;

    // revert stock for old sale
    const oldProduct = await Inventory.findById(existing.product);
    if (oldProduct) {
      oldProduct.stock = (oldProduct.stock || 0) + existing.qty;
      await oldProduct.save();
    }

    const newProduct = await Inventory.findById(product || existing.product);
    if (!newProduct) return res.status(404).json({ error: "Product not found" });

    const newQty = qty ?? existing.qty;
    if (newProduct.stock < newQty) {
      // roll back the revert since we are aborting
      if (oldProduct) {
        oldProduct.stock = Math.max(0, oldProduct.stock - existing.qty);
        await oldProduct.save();
      }
      return res.status(400).json({ error: `Not enough stock. Available: ${newProduct.stock}` });
    }

    existing.customerName = customerName?.trim() ?? existing.customerName;
    existing.product = newProduct._id;
    existing.productName = newProduct.name;
    existing.qty = newQty;
    existing.price = price ?? existing.price;
    existing.total = Number(existing.price) * Number(existing.qty);
    existing.date = date ?? existing.date;
    await existing.save();

    newProduct.stock -= Number(newQty);
    await newProduct.save();

    res.json(existing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE sale -> restores inventory stock
router.delete("/:id", async (req, res) => {
  try {
    const sale = await Sale.findByIdAndDelete(req.params.id);
    if (!sale) return res.status(404).json({ error: "Sale not found" });

    const prod = await Inventory.findById(sale.product);
    if (prod) {
      prod.stock = (prod.stock || 0) + sale.qty;
      await prod.save();
    }

    res.json({ message: "Sale deleted", id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
