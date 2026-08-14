const mongoose = require("mongoose");

const purchaseSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Inventory", required: true },
    productName: { type: String, required: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
    supplierName: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    cost: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Purchase", purchaseSchema, "purchases");
