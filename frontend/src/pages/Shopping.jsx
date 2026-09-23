import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiAlertTriangle,
  FiBox,
  FiFilter,
  FiPackage,
  FiSearch,
  FiSave,
  FiShoppingCart,
  FiTrash2,
  FiX,
  FiEdit2,
} from "react-icons/fi";

import "./Shopping.css";
import {
  getShoppingProducts,
  addProduct,
  updateProduct,
  deleteProduct,
} from "../services/shoppingService";

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const initialProduct = {
  product_name: "",
  category: "",
  price: "",
  stock_qty: "",
  image_url: "",
  description: "",
};

const fallbackImage = "https://placehold.co/500x360/e5e7eb/334155?text=Product";

const normalizeProductImageUrl = (value) => {
  const rawUrl = String(value || "").trim();
  if (!rawUrl) return "";

  try {
    const parsedUrl = new URL(rawUrl);
    const embeddedImage =
      parsedUrl.searchParams.get("imgurl") ||
      parsedUrl.searchParams.get("mediaurl") ||
      parsedUrl.searchParams.get("url");

    if (embeddedImage) {
      return decodeURIComponent(embeddedImage);
    }
  } catch {
    return rawUrl;
  }

  return rawUrl;
};

function Shopping() {
  const [products, setProducts] = useState([]);
  const [productForm, setProductForm] = useState(initialProduct);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const productFormRef = useRef(null);

  const showSuccess = (text) => {
    setError("");
    setMessage(text);
    window.setTimeout(() => setMessage(""), 2800);
  };

  const loadShopping = async () => {
    try {
      setLoading(true);
      setError("");
      const productData = await getShoppingProducts();
      setProducts(Array.isArray(productData) ? productData : []);
    } catch (err) {
      console.log(err);
      setError("Shopping data load failed. Please check backend and database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadShopping();
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
      const matchCategory = category === "All" || product.category === category;
      return matchSearch && matchCategory;
    });
  }, [products, search, category]);

  const shoppingStats = useMemo(
    () => ({
      inStock: products.filter((product) => Number(product.stock_qty || 0) > 0).length,
      lowStock: products.filter(
        (product) => Number(product.stock_qty || 0) > 0 && Number(product.stock_qty || 0) <= Number(product.min_stock || 0)
      ).length,
    }),
    [products]
  );

  const resetShoppingFilters = () => {
    setSearch("");
    setCategory("All");
  };

  const handleProductChange = (event) => {
    const { name, value } = event.target;
    setProductForm({
      ...productForm,
      [name]: name === "image_url" ? normalizeProductImageUrl(value) : value,
    });
  };

  const resetProductForm = () => {
    setEditingId(null);
    setProductForm(initialProduct);
  };

  const editProduct = (product) => {
    setEditingId(product.id);
    setSelectedProduct(null);
    setProductForm({
      product_name: product.product_name || "",
      category: product.category || "",
      price: product.price || "",
      stock_qty: product.stock_qty || "",
      image_url: product.image_url || "",
      description: product.description || "",
    });
    window.setTimeout(() => {
      productFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const saveProduct = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      const productPayload = {
        ...productForm,
        image_url: normalizeProductImageUrl(productForm.image_url),
      };

      if (editingId) {
        const result = await updateProduct(editingId, productPayload);
        showSuccess(result.message || "Product updated successfully.");
      } else {
        const result = await addProduct(productPayload);
        showSuccess(result.message || "Product added successfully.");
      }

      resetProductForm();
      await loadShopping();
    } catch (err) {
      console.log(err);
      setError(err.response?.data?.message || "Product save failed.");
    } finally {
      setSaving(false);
    }
  };

  const removeProduct = async (id) => {
    if (!window.confirm("Delete this product?")) return;

    try {
      setError("");
      const result = await deleteProduct(id);
      showSuccess(result.message || "Product deleted successfully.");
      await loadShopping();
    } catch (err) {
      console.log(err);
      setError(err.response?.data?.message || "Product delete failed.");
    }
  };

  const handleImageError = (event) => {
    if (event.currentTarget.src !== fallbackImage) {
      event.currentTarget.src = fallbackImage;
    }
  };

  return (
    <div className="shopping-page">
      <div className="shopping-header page-hero">
        <div>
          <span className="page-kicker"><FiShoppingCart /> Shopping orders</span>
          <h1>Shopping</h1>
          <p>Manage products, stock visibility, and order status from one screen.</p>
        </div>
        <div className="shopping-search">
          <label className="control-with-icon">
            <FiSearch />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search product..." />
          </label>
          <label className="control-with-icon">
            <FiFilter />
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {(message || error) && <div className={error ? "shop-alert error" : "shop-alert success"}>{error || message}</div>}

      <section className="shopping-stats" aria-label="Shopping summary">
        <div className="shop-stat">
          <FiPackage />
          <span>Products in stock</span>
          <strong>{shoppingStats.inStock}</strong>
        </div>
        <div className="shop-stat warning">
          <FiAlertTriangle />
          <span>Low stock</span>
          <strong>{shoppingStats.lowStock}</strong>
        </div>
      </section>

      <div className="category-strip" aria-label="Product categories">
        {categories.map((item) => (
          <button
            className={category === item ? "active" : ""}
            key={item}
            type="button"
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
        {(search || category !== "All") && (
          <button className="clear-filter-btn" type="button" onClick={resetShoppingFilters}>
            <FiX /> Clear
          </button>
        )}
      </div>

      <div className="shopping-layout">
        <section className="product-area">
          <div className="section-title-row">
            <div>
              <h2>Product Catalogue</h2>
              <p>{filteredProducts.length} products available for the current filter.</p>
            </div>
          </div>
          <div className="product-grid">
            {loading ? (
              Array.from({ length: 6 }).map((_, index) => <div className="shop-product-card product-skeleton" key={index} />)
            ) : filteredProducts.length ? (
              filteredProducts.map((product) => (
                <article className="shop-product-card" key={product.id}>
                  <button className="product-image-button" type="button" onClick={() => setSelectedProduct(product)}>
                    <img src={product.image_url || fallbackImage} alt={product.product_name} onError={handleImageError} />
                  </button>
                  <div className="product-body">
                    <div>
                      <h2>{product.product_name}</h2>
                      <span className="product-category"><FiBox /> {product.category || "General"}</span>
                    </div>
                    <strong>{formatMoney(product.price)}</strong>
                    <p>{product.description || "Product details available."}</p>
                    <div className="stock-meter" aria-label={`${product.stock_qty || 0} stock available`}>
                      <span
                        style={{
                          width: `${Math.min(100, Math.max(6, (Number(product.stock_qty || 0) / Math.max(Number(product.min_stock || 1) * 3, 1)) * 100))}%`,
                        }}
                      />
                    </div>
                    <small
                      className={
                        Number(product.stock_qty || 0) <= 0
                          ? "stock-low"
                          : Number(product.stock_qty || 0) <= Number(product.min_stock || 0)
                            ? "stock-warning"
                            : ""
                      }
                    >
                      Stock: {product.stock_qty || 0}
                    </small>
                    <div className="product-actions">
                      <button type="button" onClick={() => editProduct(product)}>
                        <FiEdit2 />
                        Edit
                      </button>
                      <button type="button" className="delete-btn" onClick={() => removeProduct(product.id)}>
                        <FiTrash2 />
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="empty-shop">No products found.</div>
            )}
          </div>
        </section>
      </div>

      <section ref={productFormRef} className={`product-admin-panel ${editingId ? "is-editing" : ""}`}>
        <div className="product-admin-header">
          <div>
            <h2>{editingId ? "Edit Product" : "Add Product"}</h2>
            <p>{editingId ? "Update product information and catalogue stock." : "Create a catalogue item with image, price, stock, and description."}</p>
          </div>
          <div className="product-admin-header-actions">
            {editingId && (
              <button className="secondary-action-btn" type="button" onClick={resetProductForm}>
                <FiX />
                Cancel
              </button>
            )}
            <button className="product-submit-btn" type="submit" form="product-admin-form" disabled={saving}>
              <FiSave />
              {saving ? "Saving..." : editingId ? "Update Product" : "Save Product"}
            </button>
          </div>
        </div>

        <div className="product-admin-shell">
          <div className="product-form-preview">
            <img
              src={productForm.image_url || fallbackImage}
              alt={productForm.product_name || "Product preview"}
              onError={handleImageError}
            />
            <div className="product-preview-meta">
              <span>{productForm.category || "General"}</span>
              <strong>{productForm.product_name || "Product name"}</strong>
              <p>{formatMoney(productForm.price)}</p>
            </div>
            <div className="product-preview-stock">
              <span>Stock</span>
              <b>{productForm.stock_qty || 0}</b>
            </div>
          </div>

          <form id="product-admin-form" className="product-admin-form" onSubmit={saveProduct} noValidate>
            <div className="product-form-grid">
              <label className="product-field product-field-name">
                <span>Product Name</span>
                <input name="product_name" value={productForm.product_name} onChange={handleProductChange} placeholder="Aashirvaad Atta 5kg" required />
              </label>
              <label className="product-field">
                <span>Category</span>
                <input name="category" value={productForm.category} onChange={handleProductChange} placeholder="Grocery" required />
              </label>
              <label className="product-field">
                <span>Price</span>
                <input type="number" min="1" name="price" value={productForm.price} onChange={handleProductChange} placeholder="0" required />
              </label>
              <label className="product-field">
                <span>Stock Quantity</span>
                <input type="number" min="0" name="stock_qty" value={productForm.stock_qty} onChange={handleProductChange} placeholder="0" />
              </label>
              <label className="product-field product-field-image">
                <span>Image URL</span>
                <input name="image_url" value={productForm.image_url} onChange={handleProductChange} placeholder="https://..." />
                <small>Paste a direct image URL or Google image link.</small>
              </label>
              <label className="product-field product-field-description">
                <span>Description</span>
                <textarea rows="3" name="description" value={productForm.description} onChange={handleProductChange} placeholder="Short product details for the catalogue" />
              </label>
            </div>

          </form>
        </div>
      </section>

      {selectedProduct && (
        <div className="product-modal-backdrop" onClick={() => setSelectedProduct(null)}>
          <div className="product-modal" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close-btn" type="button" aria-label="Close details" onClick={() => setSelectedProduct(null)}>
              <FiX />
            </button>
            <img src={selectedProduct.image_url || fallbackImage} alt={selectedProduct.product_name} onError={handleImageError} />
            <div>
              <h2>{selectedProduct.product_name}</h2>
              <strong>{formatMoney(selectedProduct.price)}</strong>
              <p>{selectedProduct.description || "Product details available."}</p>
              <span>Available stock: {selectedProduct.stock_qty || 0}</span>
              <div className="modal-actions">
                <button type="button" onClick={() => setSelectedProduct(null)}>Close</button>
                <button type="button" onClick={() => editProduct(selectedProduct)}>Edit Product</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Shopping;
