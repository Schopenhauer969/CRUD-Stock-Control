const express = require("express");
const router = express.Router();
const Supplier = require("../models/Supplier");

// GET all suppliers
router.get("/", async (req, res) => {
  try {
    const data = await Supplier.find().sort({ createdAt: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one supplier
router.get("/:id", async (req, res) => {
  try {
    const sup = await Supplier.findById(req.params.id);
    if (!sup) return res.status(404).json({ error: "Supplier not found" });
    res.json(sup);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE supplier
router.post("/", async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Supplier name is required" });
    }
    const sup = await Supplier.create({ name: name.trim(), phone, address });
    res.status(201).json(sup);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE supplier
router.put("/:id", async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    const sup = await Supplier.findByIdAndUpdate(
      req.params.id,
      { name: name?.trim(), phone, address },
      { new: true, runValidators: true }
    );
    if (!sup) return res.status(404).json({ error: "Supplier not found" });
    res.json(sup);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE supplier
router.delete("/:id", async (req, res) => {
  try {
    const sup = await Supplier.findByIdAndDelete(req.params.id);
    if (!sup) return res.status(404).json({ error: "Supplier not found" });
    res.json({ message: "Supplier deleted", id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
