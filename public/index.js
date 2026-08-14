// ─── API HELPER ─────────────────────────────────────────────────────────────
const API = "/api";

async function apiRequest(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

const api = {
  get: (url) => apiRequest(url),
  post: (url, body) =>
    apiRequest(url, { method: "POST", body: JSON.stringify(body) }),
  put: (url, body) =>
    apiRequest(url, { method: "PUT", body: JSON.stringify(body) }),
  del: (url) => apiRequest(url, { method: "DELETE" }),
};

// ─── STATE (in-memory cache of what's in MongoDB) ─────────────────────────────
const state = {
  categories: [],
  inventory: [],
  suppliers: [],
  purchases: [],
  sales: [],
};

// ─── TOAST ─────────────────────────────────────────────────────────────────
function showToast(msg, type = "success") {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "show " + type;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => (t.className = ""), 2500);
}

// ─── CONFIRM MODAL ─────────────────────────────────────────────────────────
function confirmDelete(message, onConfirm) {
  const modal = document.getElementById("confirmModal");
  document.getElementById("confirmMessage").textContent = message;
  modal.classList.add("open");
  document.getElementById("confirmOk").onclick = () => {
    modal.classList.remove("open");
    onConfirm();
  };
  document.getElementById("confirmCancel").onclick = () =>
    modal.classList.remove("open");
}

// ─── PAGE NAVIGATION ───────────────────────────────────────────────────────
document.querySelectorAll(".menu li").forEach((li) => {
  li.addEventListener("click", () => {
    document
      .querySelectorAll(".menu li")
      .forEach((x) => x.classList.remove("active"));
    li.classList.add("active");
    const page = li.dataset.page;
    document
      .querySelectorAll(".page")
      .forEach((p) => p.classList.remove("active-page"));
    document.getElementById(page).classList.add("active-page");

    if (page === "dashboard") loadDashboard();
    if (page === "category") renderCategories();
    if (page === "inventory") {
      populateCategoryDropdown();
      renderInventory();
    }
    if (page === "supplier") renderSuppliers();
    if (page === "purchase") {
      populateProductDropdown("purProduct");
      populateSupplierDropdown();
      renderPurchases();
    }
    if (page === "sales") {
      populateProductDropdown("salProduct");
      renderSales();
    }
  });
});

// ─── HELPERS ───────────────────────────────────────────────────────────────
function emptyRow(colspan, message = "No records found.") {
  return `<tr class="empty-row"><td colspan="${colspan}">${message}</td></tr>`;
}

function filtered(items, searchId, keys) {
  const q = document.getElementById(searchId)?.value.toLowerCase() || "";
  if (!q) return items;
  return items.filter((i) =>
    keys.some((k) =>
      String(i[k] || "")
        .toLowerCase()
        .includes(q),
    ),
  );
}

function formatDate(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function toDateInputValue(d) {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

// ─── DASHBOARD ─────────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const data = await api.get(`${API}/dashboard`);
    document.getElementById("totalAmount").textContent =
      "$" + Number(data.totalAmount).toFixed(2);
    document.getElementById("totalStock").textContent = data.totalStock;
    document.getElementById("purchaseRecord").textContent = data.purchaseRecord;
    document.getElementById("saleRecord").textContent = data.saleRecord;
  } catch (err) {
    console.error("Dashboard error:", err);
  }
}

// ─── CATEGORIES ────────────────────────────────────────────────────────────
async function loadCategories() {
  state.categories = await api.get(`${API}/categories`);
}

async function saveCategory() {
  const name = document.getElementById("catName").value.trim();
  const description = document.getElementById("catDesc").value.trim();
  const editId = document.getElementById("catEditId").value;

  if (!name) {
    showToast("Category name is required.", "error");
    return;
  }

  try {
    if (editId) {
      await api.put(`${API}/categories/${editId}`, { name, description });
      showToast("Category updated!");
    } else {
      await api.post(`${API}/categories`, { name, description });
      showToast("Category added!");
    }
    clearCategoryForm();
    await loadCategories();
    renderCategories();
  } catch (err) {
    showToast(err.message, "error");
  }
}

function editCategory(id) {
  const cat = state.categories.find((c) => c._id === id);
  if (!cat) return;
  document.getElementById("catName").value = cat.name;
  document.getElementById("catDesc").value = cat.description || "";
  document.getElementById("catEditId").value = cat._id;
  document.getElementById("cat-form-title").textContent = "Edit Category";
  document.getElementById("catCancelBtn").classList.add("visible");
  document.getElementById("catName").focus();
}

function deleteCategory(id) {
  confirmDelete(
    "Delete this category? Products using it will lose their category.",
    async () => {
      try {
        await api.del(`${API}/categories/${id}`);
        await loadCategories();
        renderCategories();
        showToast("Category deleted.", "error");
      } catch (err) {
        showToast(err.message, "error");
      }
    },
  );
}

function cancelCategory() {
  clearCategoryForm();
}

function clearCategoryForm() {
  document.getElementById("catName").value = "";
  document.getElementById("catDesc").value = "";
  document.getElementById("catEditId").value = "";
  document.getElementById("cat-form-title").textContent = "Add Category";
  document.getElementById("catCancelBtn").classList.remove("visible");
}

function renderCategories() {
  const items = filtered(state.categories, "catSearch", [
    "name",
    "description",
  ]);
  const tbody = document.getElementById("catBody");
  if (!items.length) {
    tbody.innerHTML = emptyRow(4);
    return;
  }
  tbody.innerHTML = items
    .map(
      (c, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${c.name}</strong></td>
        <td>${c.description || "—"}</td>
        <td>
        <button class="btn-secondary btn-edit" onclick="editCategory('${c._id}')">Edit</button>
        <button class="btn-secondary btn-delete" onclick="deleteCategory('${c._id}')">Delete</button>
      </td>
      </tr>`,
    )
    .join("");
}

// ─── INVENTORY ─────────────────────────────────────────────────────────────
async function loadInventory() {
  state.inventory = await api.get(`${API}/inventorys`);
}

function populateCategoryDropdown() {
  const sel = document.getElementById("invCategory");
  const cur = sel.value;
  sel.innerHTML = '<option value="">-- Select Category --</option>';
  state.categories.forEach(
    (c) =>
      (sel.innerHTML += `<option value="${c._id}" ${cur === c._id ? "selected" : ""}>${c.name}</option>`),
  );
}

async function saveInventory() {
  const name = document.getElementById("invName").value.trim();
  const barcode = document.getElementById("invBarcode").value.trim();
  const category = document.getElementById("invCategory").value;
  const stock = parseInt(document.getElementById("invQty").value);
  const costPrice = parseFloat(document.getElementById("invCost").value) || 0;
  const sellPrice = parseFloat(document.getElementById("invPrice").value);
  const editId = document.getElementById("invEditId").value;

  if (!name) {
    showToast("Product name is required.", "error");
    return;
  }
  if (isNaN(stock) || stock < 0) {
    showToast("Enter a valid stock quantity.", "error");
    return;
  }
  if (isNaN(sellPrice) || sellPrice < 0) {
    showToast("Enter a valid sell price.", "error");
    return;
  }

  const payload = {
    name,
    barcode,
    category: category || null,
    costPrice,
    sellPrice,
    stock,
  };

  try {
    if (editId) {
      await api.put(`${API}/inventorys/${editId}`, payload);
      showToast("Product updated!");
    } else {
      await api.post(`${API}/inventorys`, payload);
      showToast("Product added!");
    }
    clearInventoryForm();
    await loadInventory();
    renderInventory();
  } catch (err) {
    showToast(err.message, "error");
  }
}

function editInventory(id) {
  const item = state.inventory.find((i) => i._id === id);
  if (!item) return;
  document.getElementById("invName").value = item.name;
  document.getElementById("invBarcode").value = item.barcode || "";
  document.getElementById("invCategory").value =
    item.category?._id || item.category || "";
  document.getElementById("invQty").value = item.stock;
  document.getElementById("invCost").value = item.costPrice || 0;
  document.getElementById("invPrice").value = item.sellPrice;
  document.getElementById("invEditId").value = item._id;
  document.getElementById("inv-form-title").textContent = "Edit Product";
  document.getElementById("invCancelBtn").classList.add("visible");
  document.getElementById("invName").focus();
}

function deleteInventory(id) {
  confirmDelete("Delete this product? This cannot be undone.", async () => {
    try {
      await api.del(`${API}/inventorys/${id}`);
      await loadInventory();
      renderInventory();
      showToast("Product deleted.", "error");
    } catch (err) {
      showToast(err.message, "error");
    }
  });
}

function cancelInventory() {
  clearInventoryForm();
}

function clearInventoryForm() {
  [
    "invName",
    "invBarcode",
    "invQty",
    "invCost",
    "invPrice",
    "invEditId",
  ].forEach((id) => (document.getElementById(id).value = ""));
  document.getElementById("invCategory").value = "";
  document.getElementById("inv-form-title").textContent = "Add Product";
  document.getElementById("invCancelBtn").classList.remove("visible");
}

function renderInventory() {
  const items = filtered(state.inventory, "invSearch", ["name", "barcode"]);
  const tbody = document.getElementById("invBody");
  if (!items.length) {
    tbody.innerHTML = emptyRow(7);
    return;
  }
  tbody.innerHTML = items
    .map((p, i) => {
      const catName = p.category?.name || "—";
      const stockBadge =
        p.stock === 0
          ? `<span class="badge badge-red">${p.stock}</span>`
          : p.stock <= 5
            ? `<span class="badge badge-blue">${p.stock}</span>`
            : `<span class="badge badge-green">${p.stock}</span>`;
      return `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${p.name}</strong></td>
        <td>${p.barcode || "—"}</td>
        <td>${catName}</td>
        <td>${stockBadge}</td>
        <td>$${Number(p.sellPrice).toFixed(2)}</td>
        <td>
          <button class="btn-secondary btn-edit" onclick="editInventory('${p._id}')">Edit</button>
          <button class="btn-secondary btn-delete" onclick="deleteInventory('${p._id}')">Delete</button>
        </td>
      </tr>`;
    })
    .join("");
}

// ─── SUPPLIERS ─────────────────────────────────────────────────────────────
async function loadSuppliers() {
  state.suppliers = await api.get(`${API}/suppliers`);
}

async function saveSupplier() {
  const name = document.getElementById("supName").value.trim();
  const phone = document.getElementById("supPhone").value.trim();
  const address = document.getElementById("supAddress").value.trim();
  const editId = document.getElementById("supEditId").value;

  if (!name) {
    showToast("Supplier name is required.", "error");
    return;
  }
  if (!phone) {
    showToast("Phone is required.", "error");
    return;
  }

  try {
    if (editId) {
      await api.put(`${API}/suppliers/${editId}`, { name, phone, address });
      showToast("Supplier updated!");
    } else {
      await api.post(`${API}/suppliers`, { name, phone, address });
      showToast("Supplier added!");
    }
    clearSupplierForm();
    await loadSuppliers();
    renderSuppliers();
  } catch (err) {
    showToast(err.message, "error");
  }
}

function editSupplier(id) {
  const s = state.suppliers.find((s) => s._id === id);
  if (!s) return;
  document.getElementById("supName").value = s.name;
  document.getElementById("supPhone").value = s.phone || "";
  document.getElementById("supAddress").value = s.address || "";
  document.getElementById("supEditId").value = s._id;
  document.getElementById("sup-form-title").textContent = "Edit Supplier";
  document.getElementById("supCancelBtn").classList.add("visible");
  document.getElementById("supName").focus();
}

function deleteSupplier(id) {
  confirmDelete("Delete this supplier?", async () => {
    try {
      await api.del(`${API}/suppliers/${id}`);
      await loadSuppliers();
      renderSuppliers();
      showToast("Supplier deleted.", "error");
    } catch (err) {
      showToast(err.message, "error");
    }
  });
}

function cancelSupplier() {
  clearSupplierForm();
}

function clearSupplierForm() {
  ["supName", "supPhone", "supAddress", "supEditId"].forEach(
    (id) => (document.getElementById(id).value = ""),
  );
  document.getElementById("sup-form-title").textContent = "Add Supplier";
  document.getElementById("supCancelBtn").classList.remove("visible");
}

function renderSuppliers() {
  const items = filtered(state.suppliers, "supSearch", [
    "name",
    "phone",
    "address",
  ]);
  const tbody = document.getElementById("supBody");
  if (!items.length) {
    tbody.innerHTML = emptyRow(5);
    return;
  }
  tbody.innerHTML = items
    .map(
      (s, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${s.name}</strong></td>
        <td>${s.phone || "—"}</td>
        <td>${s.address || "—"}</td>
        <td>
          <button class="btn-secondary btn-edit" onclick="editSupplier('${s._id}')">Edit</button>
          <button class="btn-secondary btn-delete" onclick="deleteSupplier('${s._id}')">Delete</button>
        </td>
      </tr>`,
    )
    .join("");
}

// ─── DROPDOWN HELPERS (Product / Supplier) ─────────────────────────────────
function populateProductDropdown(selectId) {
  const sel = document.getElementById(selectId);
  const cur = sel.value;
  sel.innerHTML = '<option value="">-- Select Product --</option>';
  state.inventory.forEach(
    (p) =>
      (sel.innerHTML += `<option value="${p._id}" ${cur === p._id ? "selected" : ""}>${p.name} (stock: ${p.stock})</option>`),
  );
}

function populateSupplierDropdown() {
  const sel = document.getElementById("purSupplier");
  const cur = sel.value;
  sel.innerHTML = '<option value="">-- Select Supplier --</option>';
  state.suppliers.forEach(
    (s) =>
      (sel.innerHTML += `<option value="${s._id}" ${cur === s._id ? "selected" : ""}>${s.name}</option>`),
  );
}

// ─── PURCHASES ─────────────────────────────────────────────────────────────
async function loadPurchases() {
  state.purchases = await api.get(`${API}/purchases`);
}

async function savePurchase() {
  const product = document.getElementById("purProduct").value;
  const supplier = document.getElementById("purSupplier").value;
  const qty = parseInt(document.getElementById("purQty").value);
  const cost = parseFloat(document.getElementById("purCost").value);
  const date = document.getElementById("purDate").value;
  const editId = document.getElementById("purEditId").value;

  if (!product) return showToast("Select a product.", "error");
  if (!supplier) return showToast("Select a supplier.", "error");
  if (isNaN(qty) || qty < 1)
    return showToast("Enter a valid quantity.", "error");
  if (isNaN(cost) || cost < 0) return showToast("Enter a valid cost.", "error");
  if (!date) return showToast("Select a date.", "error");

  try {
    if (editId) {
      await api.put(`${API}/purchases/${editId}`, {
        product,
        supplier,
        qty,
        cost,
        date,
      });
      showToast("Purchase updated!");
    } else {
      await api.post(`${API}/purchases`, {
        product,
        supplier,
        qty,
        cost,
        date,
      });
      showToast("Purchase saved! Stock updated.");
    }
    clearPurchaseForm();
    await Promise.all([loadPurchases(), loadInventory()]);
    populateProductDropdown("purProduct");
    renderPurchases();
  } catch (err) {
    showToast(err.message, "error");
  }
}

function editPurchase(id) {
  const p = state.purchases.find((p) => p._id === id);
  if (!p) return;
  document.getElementById("purProduct").value = p.product;
  document.getElementById("purSupplier").value = p.supplier;
  document.getElementById("purQty").value = p.qty;
  document.getElementById("purCost").value = p.cost;
  document.getElementById("purDate").value = toDateInputValue(p.date);
  document.getElementById("purEditId").value = p._id;
  document.getElementById("pur-form-title").textContent = "Edit Purchase";
  document.getElementById("purCancelBtn").classList.add("visible");
}

function deletePurchase(id) {
  confirmDelete(
    "Delete this purchase record? Inventory stock will be reduced accordingly.",
    async () => {
      try {
        await api.del(`${API}/purchases/${id}`);
        await Promise.all([loadPurchases(), loadInventory()]);
        renderPurchases();
        showToast("Purchase deleted.", "error");
      } catch (err) {
        showToast(err.message, "error");
      }
    },
  );
}

function cancelPurchase() {
  clearPurchaseForm();
}

function clearPurchaseForm() {
  ["purQty", "purCost", "purDate", "purEditId"].forEach(
    (id) => (document.getElementById(id).value = ""),
  );
  document.getElementById("purProduct").value = "";
  document.getElementById("purSupplier").value = "";
  document.getElementById("pur-form-title").textContent = "Add Purchase";
  document.getElementById("purCancelBtn").classList.remove("visible");
}

function renderPurchases() {
  const items = filtered(state.purchases, "purSearch", [
    "productName",
    "supplierName",
  ]);
  const tbody = document.getElementById("purBody");
  if (!items.length) {
    tbody.innerHTML = emptyRow(7);
    return;
  }
  tbody.innerHTML = items
    .map(
      (p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${p.productName}</strong></td>
        <td>${p.supplierName}</td>
        <td>${p.qty}</td>
        <td>$${Number(p.cost).toFixed(2)}</td>
        <td>${formatDate(p.date)}</td>
        <td>
          <button class="btn-secondary btn-edit" onclick="editPurchase('${p._id}')">Edit</button>
          <button class="btn-secondary btn-delete" onclick="deletePurchase('${p._id}')">Delete</button>
        </td>
      </tr>`,
    )
    .join("");
}

// ─── SALES (the selling system) ────────────────────────────────────────────
async function loadSales() {
  state.sales = await api.get(`${API}/sales`);
}

async function saveSale() {
  const customerName = document.getElementById("salCustomer").value.trim();
  const product = document.getElementById("salProduct").value;
  const qty = parseInt(document.getElementById("salQty").value);
  const price = parseFloat(document.getElementById("salPrice").value);
  const date = document.getElementById("salDate").value;
  const editId = document.getElementById("salEditId").value;

  if (!customerName) return showToast("Customer name is required.", "error");
  if (!product) return showToast("Select a product.", "error");
  if (isNaN(qty) || qty < 1)
    return showToast("Enter a valid quantity.", "error");
  if (isNaN(price) || price < 0)
    return showToast("Enter a valid price.", "error");
  if (!date) return showToast("Select a date.", "error");

  try {
    if (editId) {
      await api.put(`${API}/sales/${editId}`, {
        customerName,
        product,
        qty,
        price,
        date,
      });
      showToast("Sale updated!");
    } else {
      await api.post(`${API}/sales`, {
        customerName,
        product,
        qty,
        price,
        date,
      });
      showToast("Sale recorded! Stock deducted.");
    }
    clearSaleForm();
    await Promise.all([loadSales(), loadInventory()]);
    populateProductDropdown("salProduct");
    renderSales();
  } catch (err) {
    showToast(err.message, "error");
  }
}

function editSale(id) {
  const s = state.sales.find((s) => s._id === id);
  if (!s) return;
  document.getElementById("salCustomer").value = s.customerName;
  document.getElementById("salProduct").value = s.product;
  document.getElementById("salQty").value = s.qty;
  document.getElementById("salPrice").value = s.price;
  document.getElementById("salDate").value = toDateInputValue(s.date);
  document.getElementById("salEditId").value = s._id;
  document.getElementById("sal-form-title").textContent = "Edit Sale";
  document.getElementById("salCancelBtn").classList.add("visible");
}

function deleteSale(id) {
  confirmDelete(
    "Delete this sale record? Inventory stock will be restored.",
    async () => {
      try {
        await api.del(`${API}/sales/${id}`);
        await Promise.all([loadSales(), loadInventory()]);
        renderSales();
        showToast("Sale deleted.", "error");
      } catch (err) {
        showToast(err.message, "error");
      }
    },
  );
}

function cancelSale() {
  clearSaleForm();
}

function clearSaleForm() {
  ["salCustomer", "salQty", "salPrice", "salDate", "salEditId"].forEach(
    (id) => (document.getElementById(id).value = ""),
  );
  document.getElementById("salProduct").value = "";
  document.getElementById("sal-form-title").textContent = "Add Sale";
  document.getElementById("salCancelBtn").classList.remove("visible");
}

function renderSales() {
  const items = filtered(state.sales, "salSearch", [
    "customerName",
    "productName",
  ]);
  const tbody = document.getElementById("salBody");
  if (!items.length) {
    tbody.innerHTML = emptyRow(7);
    return;
  }
  tbody.innerHTML = items
    .map(
      (s, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><strong>${s.customerName}</strong></td>
        <td>${s.productName}</td>
        <td>${s.qty}</td>
        <td><span class="badge badge-green">$${Number(s.total).toFixed(2)}</span></td>
        <td>${formatDate(s.date)}</td>
        <td>
          <button class="btn-secondary btn-edit" onclick="editSale('${s._id}')">Edit</button>
          <button class="btn-secondary btn-delete" onclick="deleteSale('${s._id}')">Delete</button>
        </td>
      </tr>`,
    )
    .join("");
}

// ─── AUTO-FILL SALE PRICE FROM SELECTED PRODUCT ────────────────────────────
document.addEventListener("change", (e) => {
  if (e.target.id === "salProduct") {
    const prod = state.inventory.find((p) => p._id === e.target.value);
    if (prod && !document.getElementById("salEditId").value) {
      document.getElementById("salPrice").value = prod.sellPrice;
    }
  }
});

// ─── INIT ──────────────────────────────────────────────────────────────────
async function init() {
  try {
    await Promise.all([
      loadCategories(),
      loadInventory(),
      loadSuppliers(),
      loadPurchases(),
      loadSales(),
    ]);
    loadDashboard();
    renderCategories();
    renderInventory();
    renderSuppliers();
    renderPurchases();
    renderSales();
    populateCategoryDropdown();
  } catch (err) {
    console.error("Init error:", err);
    showToast("Could not connect to server. Is the backend running?", "error");
  }
  lucide.createIcons();
}

document.addEventListener("DOMContentLoaded", init);
