require("dotenv").config(); // <--- MOVE THIS TO LINE 1

const express = require("express");
const path = require("path");
const connectDB = require("./config/db");

const app = express();

// =====================
// Middleware
// =====================
app.use(express.json());

// =====================
// MongoDB Connection
// =====================
connectDB();

// =====================
// API ROUTES
// =====================
app.use("/api/categories", require("./routes/categories"));
app.use("/api/suppliers", require("./routes/suppliers"));
app.use("/api/inventorys", require("./routes/inventory"));
app.use("/api/purchases", require("./routes/purchases"));
app.use("/api/sales", require("./routes/sales"));
app.use("/api/dashboard", require("./routes/dashboard"));

// =====================
// STATIC FRONTEND
// =====================
app.use(express.static(path.join(__dirname, "public")));

// SPA fallback (ignore /api routes)
app.use((req, res, next) => {
  if (req.originalUrl.startsWith("/api")) return next();
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// =====================
// START SERVER
// =====================
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
