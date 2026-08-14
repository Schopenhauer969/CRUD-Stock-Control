const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true, trim: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Inventory", required: true },
    productName: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Sale", saleSchema, "sales");
