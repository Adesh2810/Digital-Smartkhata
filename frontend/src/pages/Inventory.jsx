import { useEffect, useMemo, useState } from "react";
import {
  FiAlertTriangle,
  FiArchive,
  FiBox,
  FiEdit2,
  FiFilter,
  FiImage,
  FiRefreshCw,
  FiSearch,
  FiTrendingUp,
  FiTrash2,
} from "react-icons/fi";
import "./Shopping.css";
import "./Inventory.css";
import {
  addInventoryProduct,
  deleteInventoryProduct,
  getInventoryProducts,
  getInventorySummary,
  getStockHistory,
  updateInventoryProduct,
  updateProductStock,
} from "../services/inventoryService";

const todayInput = () => new Date().toISOString().slice(0, 10);

const emptyProduct = {
  product_name: "",
  category: "General",
  price: "",
  cost_price: "",
  stock_qty: "",
  min_stock: "5",
  image_url: "",
  description: "",
  stock_entry_date: todayInput(),
};

const fallbackImage = "https://placehold.co/500x360/e5e7eb/334155?text=Product";

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

function Inventory() {
  const [products, setProducts] = useState([]);
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState({
    total_products: 0,
    total_stock: 0,
    inventory_value: 0,
    low_stock_items: 0,
    out_stock_items: 0,
  });
  const [form, setForm] = useState(emptyProduct);
  const [stockForm, setStockForm] = useState({ product_id: "", movement_type: "ADD", quantity: "", note: "" });
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const freshProductForm = () => ({ ...emptyProduct, stock_entry_date: todayInput() });

  const loadInventory = async () => {
    try {
      setLoading(true);
      setError("");
      const [summaryData, productData, historyData] = await Promise.all([
        getInventorySummary(),
        getInventoryProducts(),
        getStockHistory(),
      ]);
      setSummary(summaryData);
      setProducts(productData);
      setHistory(historyData);
    } catch (err) {
      console.log(err);
      setError("Inventory data load failed. Please check backend and database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadInventory();
  }, []);

  const categories = useMemo(
    () => ["All", ...new Set(products.map((product) => product.category).filter(Boolean))],
    [products]
  );

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchSearch =
        !query ||
        [product.product_name, product.category, product.description]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      const matchFilter =
        filter === "All" ||
        product.category === filter ||
        (filter === "Low Stock" && Number(product.stock_qty) <= Number(product.min_stock)) ||
        (filter === "Out of Stock" && Number(product.stock_qty) <= 0);
      return matchSearch && matchFilter;
    });
  }, [products, search, filter]);

  const inventoryInsights = useMemo(() => {
    const saleValue = products.reduce(
      (sum, product) => sum + Number(product.stock_qty || 0) * Number(product.price || 0),
      0
    );
    return {
      saleValue,
    };
  }, [products]);

  const handleFormChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleStockChange = (event) => {
    setStockForm({ ...stockForm, [event.target.name]: event.target.value });
  };

  const showSuccess = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 2600);
  };

  const resetProductForm = () => {
    setEditingId(null);
    setForm(freshProductForm());
  };

  const resetInventoryFilters = () => {
    setSearch("");
    setFilter("All");
  };

  const submitProduct = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      if (editingId) {
        await updateInventoryProduct(editingId, form);
        showSuccess("Product updated successfully.");
      } else {
        await addInventoryProduct(form);
        showSuccess("Product added successfully.");
      }

      resetProductForm();
      await loadInventory();
    } catch (err) {
      console.log(err);
      setError(err.response?.data?.message || "Product save failed.");
    } finally {
      setSaving(false);
    }
  };

  const editProduct = (product) => {
    setEditingId(product.id);
    setForm({
      product_name: product.product_name || "",
      category: product.category || "General",
      price: product.price || "",
      cost_price: product.cost_price || "",
      stock_qty: product.stock_qty || "",
      min_stock: product.min_stock || "5",
      image_url: product.image_url || "",
      description: product.description || "",
      stock_entry_date: product.stock_entry_date ? String(product.stock_entry_date).slice(0, 10) : todayInput(),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteProduct = async (id) => {
    if (!window.confirm("Delete this product?")) return;

    try {
      setError("");
      await deleteInventoryProduct(id);
      showSuccess("Product deleted successfully.");
      await loadInventory();
    } catch (err) {
      console.log(err);
      setError(err.response?.data?.message || "Product delete failed.");
    }
  };

  const submitStock = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      await updateProductStock(stockForm.product_id, stockForm);
      setStockForm({ product_id: "", movement_type: "ADD", quantity: "", note: "" });
      showSuccess("Stock updated successfully.");
      await loadInventory();
    } catch (err) {
      console.log(err);
      setError(err.response?.data?.message || "Stock update failed.");
    } finally {
      setSaving(false);
    }
  };

  const lowStockProducts = useMemo(
    () => products.filter((product) => Number(product.stock_qty || 0) <= Number(product.min_stock || 0)).slice(0, 4),
    [products]
  );

  const requiredProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          Number(product.stock_qty || 0) > 0 &&
          Number(product.stock_qty || 0) <= Number(product.min_stock || 0)
      ),
    [products]
  );

  const handleImageError = (event) => {
    event.currentTarget.src = fallbackImage;
  };

  return (
    <div className="collections-page">
      <div className="collections-header page-hero">
        <div>
          <span className="page-kicker"><FiArchive /> Inventory control</span>
          <h1>Inventory / Stock</h1>
          <p>Manage product entries, stock movement, reorder alerts, and inventory value.</p>
        </div>
        <div className="collection-toolbar">
          <label className="control-with-icon">
            <FiSearch />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products..." />
          </label>
          <label className="control-with-icon">
            <FiFilter />
            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option>All</option>
              <option>Low Stock</option>
              <option>Out of Stock</option>
              {categories.filter((item) => item !== "All").map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {(message || error) && <div className={error ? "shop-alert error" : "shop-alert success"}>{error || message}</div>}

      <div className="collection-stats">
        <div className="collection-stat-card">
          <FiBox />
          <span>Total Products</span>
          <strong>{summary.total_products}</strong>
        </div>
        <div className="collection-stat-card">
          <FiArchive />
          <span>Total Stock Qty</span>
          <strong>{summary.total_stock}</strong>
        </div>
        <div className="collection-stat-card">
          <FiImage />
          <span>Inventory Value</span>
          <strong>{formatMoney(summary.inventory_value)}</strong>
        </div>
        <div className="collection-stat-card profit">
          <FiTrendingUp />
          <span>Sale Value</span>
          <strong>{formatMoney(inventoryInsights.saleValue)}</strong>
        </div>
        <div className="collection-stat-card alert">
          <FiAlertTriangle />
          <span>Low / Empty Stock</span>
          <strong>{summary.low_stock_items}</strong>
        </div>
      </div>

      <div className="category-strip collection-filter-strip" aria-label="Inventory filters">
        {["All", "Low Stock", "Out of Stock", ...categories.filter((item) => item !== "All")].map((item) => (
          <button className={filter === item ? "active" : ""} key={item} type="button" onClick={() => setFilter(item)}>
            {item}
          </button>
        ))}
        {(search || filter !== "All") && (
          <button className="clear-filter-btn" type="button" onClick={resetInventoryFilters}>
            Clear
          </button>
        )}
      </div>

      <div className="collection-layout">
        <section className="collection-form-card collection-product-entry-card">
          <div className="collection-form-title">
            <div>
              <h2>{editingId ? "Edit Product" : "Add Product / Stock Entry"}</h2>
              <p>{editingId ? "Update product details and stock level." : "Create a product and opening stock entry."}</p>
            </div>
            {editingId && <button type="button" onClick={resetProductForm}>Cancel</button>}
          </div>

          <form onSubmit={submitProduct}>
            <div className="product-preview-row">
              <img src={form.image_url || fallbackImage} alt={form.product_name || "Product preview"} onError={handleImageError} />
              <div>
                <span>Preview</span>
                <strong>{form.product_name || "Product name"}</strong>
                <p>{form.category || "General"} - {formatMoney(form.price)}</p>
              </div>
            </div>
            <div className="collection-form-grid">
              <label>
                Product Name
                <input name="product_name" value={form.product_name} onChange={handleFormChange} required />
              </label>
              <label>
                Category
                <input name="category" value={form.category} onChange={handleFormChange} required />
              </label>
              <label>
                Purchase / Cost Price
                <input type="number" min="0" name="cost_price" value={form.cost_price} onChange={handleFormChange} />
              </label>
              <label>
                Product Price
                <input type="number" min="1" name="price" value={form.price} onChange={handleFormChange} required />
              </label>
              <label>
                Available Stock
                <input type="number" min="0" name="stock_qty" value={form.stock_qty} onChange={handleFormChange} />
              </label>
              <label>
                Minimum Stock Level
                <input type="number" min="0" name="min_stock" value={form.min_stock} onChange={handleFormChange} />
              </label>
              <label>
                Stock Entry Date
                <input type="date" name="stock_entry_date" value={form.stock_entry_date} onChange={handleFormChange} />
              </label>
              <label>
                Product Image URL
                <input name="image_url" value={form.image_url} onChange={handleFormChange} placeholder="https://..." />
              </label>
            </div>
            <label>
              Product Details / Description
              <textarea name="description" value={form.description} onChange={handleFormChange} rows="3" />
            </label>
            <button className="collection-primary-btn" type="submit" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update Product" : "Add Product"}
            </button>
          </form>
        </section>

        <div className="collection-side-stack">
          <section className="collection-form-card stock-update-card">
            <div className="collection-form-title">
              <div>
                <h2>Required Product List</h2>
                <p>Choose a required product and update stock quantity.</p>
              </div>
            </div>
            <form className="stock-control" onSubmit={submitStock}>
              <label className="field-label-hidden">
                Product
                <select name="product_id" value={stockForm.product_id} onChange={handleStockChange} required>
                  <option value="">Select required product</option>
                  {requiredProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.product_name} - {product.stock_qty}
                    </option>
                  ))}
                  {!requiredProducts.length && <option disabled>No required products</option>}
                </select>
              </label>
              <div className="stock-inline-grid">
                <label>
                  Action
                  <select name="movement_type" value={stockForm.movement_type} onChange={handleStockChange}>
                    <option value="ADD">Add Stock</option>
                    <option value="REDUCE">Reduce Stock</option>
                  </select>
                </label>
                <label>
                  Quantity
                  <input type="number" name="quantity" value={stockForm.quantity} onChange={handleStockChange} min="1" required />
                </label>
              </div>
              <div className="stock-note-row">
                <label>
                  Note
                  <input name="note" value={stockForm.note} onChange={handleStockChange} placeholder="Purchase, damage, correction..." />
                </label>
                <button type="submit" disabled={saving}><FiRefreshCw /> Update Stock</button>
              </div>
            </form>
          </section>

          <section className="collection-form-card stock-alert-card">
            <div className="collection-form-title">
              <div>
                <h2>Low Stock Alert</h2>
                <p>{summary.low_stock_items} products need attention before stock becomes empty.</p>
              </div>
            </div>
            <div className="low-stock-box">
              <div className="low-stock-list">
                {lowStockProducts.length ? (
                  lowStockProducts.map((product) => (
                    <span key={product.id}>{product.product_name} ({product.stock_qty || 0})</span>
                  ))
                ) : (
                  <span>All products are above minimum stock.</span>
                )}
              </div>
            </div>

            <div className="inventory-mini">
              <div>
                <FiAlertTriangle />
                <span>Out of Stock</span>
                <strong>{summary.out_stock_items}</strong>
              </div>
            </div>
          </section>
        </div>
      </div>

      <section className="collection-table-card">
        <div className="collection-table-head">
          <div>
            <h2>Product Stock Table</h2>
            <p>{filteredProducts.length} products shown from inventory.</p>
          </div>
          <div className="table-head-actions">
            <button type="button" onClick={loadInventory}><FiRefreshCw /> Refresh</button>
          </div>
        </div>
        <div className="collection-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Image</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Available Stock</th>
                <th>Cost Price</th>
                <th>Sale Price</th>
                <th>Entry Date</th>
                <th>Last Updated</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="10" className="empty-shop">Loading stock...</td></tr>
              ) : filteredProducts.length ? (
                filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td data-label="Image"><img className="stock-thumb" src={product.image_url || fallbackImage} alt={product.product_name} onError={handleImageError} /></td>
                    <td data-label="Product Name">{product.product_name}</td>
                    <td data-label="Category">{product.category}</td>
                    <td data-label="Available Stock">{product.stock_qty}</td>
                    <td data-label="Cost Price">{formatMoney(product.cost_price)}</td>
                    <td data-label="Sale Price">{formatMoney(product.price)}</td>
                    <td data-label="Entry Date">{formatDate(product.stock_entry_date)}</td>
                    <td data-label="Last Updated">{formatDate(product.last_updated)}</td>
                    <td data-label="Status"><span className={`stock-status ${product.stock_status?.replaceAll(" ", "-").toLowerCase()}`}>{product.stock_status}</span></td>
                    <td data-label="Action">
                      <div className="stock-actions">
                        <button className="table-action-btn edit" type="button" aria-label={`Edit ${product.product_name}`} onClick={() => editProduct(product)}><FiEdit2 /></button>
                        <button className="table-action-btn delete" type="button" aria-label={`Delete ${product.product_name}`} onClick={() => deleteProduct(product.id)}><FiTrash2 /></button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="10" className="empty-shop">No products found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="history-card">
        <div className="collection-table-head">
          <div>
            <h2>Stock Movement History</h2>
            <p>Latest required product movements and stock updates.</p>
          </div>
        </div>
        <div className="history-list">
          {history.length ? (
            history.map((item) => (
              <div className="stock-row" key={item.id}>
                <div>
                  <strong>{item.product_name}</strong>
                  <span>{item.note || "Stock movement"} - {formatDate(item.created_at)}</span>
                </div>
                <b className={item.movement_type === "REDUCE" || item.movement_type === "ORDER" ? "minus" : "plus"}>
                  {item.movement_type === "ADD" ? "+" : "-"}{item.quantity}
                </b>
              </div>
            ))
          ) : (
            <div className="empty-shop">No stock history yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}

export default Inventory;
