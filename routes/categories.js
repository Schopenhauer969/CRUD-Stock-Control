const express = require("express");
const router = express.Router();
const Category = require("../models/Category");

// GET all categories
router.get("/", async (req, res) => {
  try {
    const data = await Category.find().sort({ createdAt: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET one category
router.get("/:id", async (req, res) => {
  try {
    const cat = await Category.findById(req.params.id);
    if (!cat) return res.status(404).json({ error: "Category not found" });
    res.json(cat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE category
router.post("/", async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Category name is required" });
    }
    const exists = await Category.findOne({ name: new RegExp(`^${name.trim()}$`, "i") });
    if (exists) return res.status(409).json({ error: "Category already exists" });

    const cat = await Category.create({ name: name.trim(), description: description || "" });
    res.status(201).json(cat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE category
router.put("/:id", async (req, res) => {
  try {
    const { name, description } = req.body;
    const cat = await Category.findByIdAndUpdate(
      req.params.id,
      { name: name?.trim(), description },
      { new: true, runValidators: true }
    );
    if (!cat) return res.status(404).json({ error: "Category not found" });
    res.json(cat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE category
router.delete("/:id", async (req, res) => {
  try {
    const cat = await Category.findByIdAndDelete(req.params.id);
    if (!cat) return res.status(404).json({ error: "Category not found" });
    res.json({ message: "Category deleted", id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
