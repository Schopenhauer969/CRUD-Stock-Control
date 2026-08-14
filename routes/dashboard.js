const express = require("express");
const router = express.Router();
const Inventory = require("../models/Inventory");
const Purchase = require("../models/Purchase");
const Sale = require("../models/Sale");

router.get("/", async (req, res) => {
  try {
    const [stockAgg, purchaseAgg, saleAgg] = await Promise.all([
      Inventory.aggregate([{ $group: { _id: null, totalStock: { $sum: "$stock" } } }]),
      Purchase.aggregate([{ $group: { _id: null, count: { $sum: 1 } } }]),
      Sale.aggregate([{ $group: { _id: null, totalAmount: { $sum: "$total" }, count: { $sum: 1 } } }]),
    ]);

    res.json({
      totalStock: stockAgg[0]?.totalStock || 0,
      purchaseRecord: purchaseAgg[0]?.count || 0,
      saleRecord: saleAgg[0]?.count || 0,
      totalAmount: saleAgg[0]?.totalAmount || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
