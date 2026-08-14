const express = require("express");
const router = express.Router();
const Inventory = require("../models/Inventory");

// ✅ total stock across all products (must be BEFORE /:id)
router.get("/stats/totalStock", async (req, res) => {
  try {
    const result = await Inventory.aggregate([
      { $group: { _id: null, totalStock: { $sum: "$stock" } } },
    ]);
    res.json({ totalStock: result[0]?.totalStock || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all products (with populated category)
router.get("/", async (req, res) => {
  try {
    const data = await Inventory.find().populate("category", "name").sort({ createdAt: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one product
router.get("/:id", async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id).populate("category", "name");
    if (!item) return res.status(404).json({ error: "Product not found" });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE product
router.post("/", async (req, res) => {
  try {
    const { name, barcode, category, costPrice, sellPrice, stock } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Product name is required" });
    }
    if (sellPrice === undefined || sellPrice === null || isNaN(sellPrice)) {
      return res.status(400).json({ error: "Valid sell price is required" });
    }
    const item = await Inventory.create({
      name: name.trim(),
      barcode: barcode || "",
      category: category || null,
      costPrice: costPrice || 0,
      sellPrice,
      stock: stock || 0,
    });
    const populated = await item.populate("category", "name");
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE product
router.put("/:id", async (req, res) => {
  try {
    const { name, barcode, category, costPrice, sellPrice, stock } = req.body;
    const item = await Inventory.findByIdAndUpdate(
      req.params.id,
      {
        name: name?.trim(),
        barcode,
        category: category || null,
        costPrice,
        sellPrice,
        stock,
      },
      { new: true, runValidators: true }
    ).populate("category", "name");
    if (!item) return res.status(404).json({ error: "Product not found" });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE product
router.delete("/:id", async (req, res) => {
  try {
    const item = await Inventory.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: "Product not found" });
    res.json({ message: "Product deleted", id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
