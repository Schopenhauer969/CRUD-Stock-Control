const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Supplier", supplierSchema, "suppliers");
