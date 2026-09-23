import { useEffect, useState } from "react";
import { FiClock, FiCreditCard, FiEdit2, FiSave, FiTrash2, FiTrendingDown, FiUsers } from "react-icons/fi";
import "./Supplier.css";

import {
  getSupplierPurchases,
  addSupplierPurchase,
  updateSupplierPurchase,
  deleteSupplierPurchase,
  getSupplierPurchaseSummary,
} from "../services/supplierService";

const emptySupplierForm = {
  supplier_name: "",
  contact_number: "",
  purchase_from: "",
  amount: "",
  paid_amount: "",
  bill_no: "",
  purchase_date: "",
  product_details: "",
  note: "",
};

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const toInputDate = (value) => {
  if (!value) return "";
  return String(value).slice(0, 10);
};

function Supplier() {
  const [supplierPurchases, setSupplierPurchases] = useState([]);
  const [summary, setSummary] = useState({ total_supplier_debit: 0 });
  const [supplierForm, setSupplierForm] = useState(emptySupplierForm);
  const [editingSupplierId, setEditingSupplierId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadPage = async () => {
    try {
      setLoading(true);
      setError("");

      const [supplierData, summaryData] = await Promise.all([
        getSupplierPurchases(),
        getSupplierPurchaseSummary(),
      ]);

      setSupplierPurchases(supplierData);
      setSummary(summaryData);
    } catch (err) {
      console.log(err);
      setError("Unable to load supplier data. Please check backend and database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPage();
  }, []);

  const handleSupplierChange = (event) => {
    const { name, value } = event.target;
    setSupplierForm({
      ...supplierForm,
      [name]: value,
    });
  };

  const showSuccess = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 2500);
  };

  const computePendingAmount = () => {
    const amount = Number(supplierForm.amount || 0);
    const paid = Number(supplierForm.paid_amount || 0);
    const pending = amount - paid;
    return pending >= 0 ? pending : 0;
  };

  const supplierCount = new Set(supplierPurchases.map((s) => s.supplier_name?.trim()).filter(Boolean)).size;
  const totalDebit = loading
    ? Number(summary.total_supplier_debit || 0)
    : supplierPurchases.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalPaid = supplierPurchases.reduce((sum, item) => sum + Number(item.paid_amount || 0), 0);
  const totalCredit = loading ? Number(summary.total_supplier_paid || 0) : totalPaid;
  const totalPending = supplierPurchases.reduce((sum, item) => sum + Number(item.pending_amount || 0), 0);
  const outstandingTotal = loading ? Number(summary.total_supplier_pending ?? summary.total_supplier_debit ?? 0) : totalPending;
  const summaryCards = [
    {
      label: "Suppliers Total Count",
      value: supplierCount,
      detail: "Unique suppliers recorded",
      icon: <FiUsers />,
      tone: "blue",
    },
    {
      label: "Total Credit",
      value: formatMoney(totalCredit),
      detail: "Paid amount to suppliers",
      icon: <FiCreditCard />,
      tone: "green",
    },
    {
      label: "Total Debit",
      value: formatMoney(totalDebit),
      detail: "Total purchase amount",
      icon: <FiTrendingDown />,
      tone: "orange",
    },
    {
      label: "Pending Amount",
      value: formatMoney(outstandingTotal),
      detail: "Balance amount remaining",
      icon: <FiClock />,
      tone: "teal",
    },
  ];

  const handleSaveSupplier = async (event) => {
    event.preventDefault();

    const amount = Number(supplierForm.amount || 0);
    const paid = Number(supplierForm.paid_amount || 0);

    if (paid > amount) {
      setError("Paid amount cannot be greater than amount.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      if (editingSupplierId) {
        await updateSupplierPurchase(editingSupplierId, supplierForm);
        showSuccess("Supplier purchase updated successfully.");
      } else {
        await addSupplierPurchase(supplierForm);
        showSuccess("Supplier purchase saved successfully.");
      }

      setSupplierForm(emptySupplierForm);
      setEditingSupplierId(null);
      await loadPage();
    } catch (err) {
      console.log(err);
      setError(err.response?.data?.message || "Supplier purchase save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleEditSupplier = (item) => {
    setEditingSupplierId(item.id);
    setSupplierForm({
      supplier_name: item.supplier_name || "",
       contact_number: item.contact_number || "",
      purchase_from: item.purchase_from || "",
      amount: item.amount || "",
      paid_amount: item.paid_amount || "",
      bill_no: item.bill_no || "",
      purchase_date: toInputDate(item.purchase_date),
      product_details: item.product_details || "",
      note: item.note || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteSupplier = async (id) => {
    if (!window.confirm("Delete this supplier purchase?")) return;

    try {
      await deleteSupplierPurchase(id);
      showSuccess("Supplier purchase deleted.");
      await loadPage();
    } catch (err) {
      console.log(err);
      setError("Supplier purchase delete failed.");
    }
  };

  return (
    <div className="supplier-page">
      <div className="supplier-shell">
        <div className="supplier-header">
          <div>
            <span className="eyebrow">Khata supplier desk</span>
            <h1>Supplier Management</h1>
            <p>Record supplier purchases and manage outstanding supplier balances.</p>
          </div>
        </div>

        {(message || error) && (
          <div className={error ? "notice error" : "notice success"}>
            {error || message}
          </div>
        )}

        <div className="supplier-summary-grid">
          {summaryCards.map((card) => (
            <div className={`supplier-summary-card ${card.tone}`} key={card.label}>
              <div className="summary-card-top">
                <span>{card.label}</span>
                <div className="summary-icon">{card.icon}</div>
              </div>
              <h2>{card.value}</h2>
              <p>{card.detail}</p>
            </div>
          ))}
        </div>

        <form className="supplier-form-card" onSubmit={handleSaveSupplier}>
          <div className="supplier-card-header">
            <div>
              <span className="section-label">Supplier information</span>
              <h2>{editingSupplierId ? "Edit Supplier Purchase" : "Add Supplier Purchase"}</h2>
              <p>Fill supplier, bill, amount, and item details in one compact form.</p>
            </div>

            {editingSupplierId && (
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  setEditingSupplierId(null);
                  setSupplierForm(emptySupplierForm);
                }}
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div className="supplier-form-layout">
            <div className="form-section main-fields">
              <div className="section-mini-title">Purchase Details</div>
              <div className="form-grid">
                <div className="form-group field-wide">
                  <label>Supplier Name</label>
                  <input
                    type="text"
                    name="supplier_name"
                    value={supplierForm.supplier_name}
                    onChange={handleSupplierChange}
                    placeholder="Enter supplier name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Contact Number</label>
                  <input
                    type="text"
                    name="contact_number"
                    value={supplierForm.contact_number}
                    onChange={handleSupplierChange}
                    placeholder="Enter supplier mobile number"
                    maxLength="10"
                  />
                </div>

                <div className="form-group">
                  <label>Purchase From</label>
                  <input
                    type="text"
                    name="purchase_from"
                    value={supplierForm.purchase_from}
                    onChange={handleSupplierChange}
                    placeholder="Where was the stock bought from"
                  />
                </div>

                <div className="form-group">
                  <label>Amount</label>
                  <input
                    type="number"
                    name="amount"
                    value={supplierForm.amount}
                    onChange={handleSupplierChange}
                    placeholder="Enter amount"
                    min="1"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Paid Amount</label>
                  <input
                    type="number"
                    name="paid_amount"
                    value={supplierForm.paid_amount}
                    onChange={handleSupplierChange}
                    placeholder="Amount paid to supplier"
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label>Pending Amount</label>
                  <input
                    type="text"
                    name="pending_amount"
                    value={formatMoney(computePendingAmount())}
                    readOnly
                  />
                </div>

                <div className="form-group">
                  <label>Bill Number</label>
                  <input
                    type="text"
                    name="bill_no"
                    value={supplierForm.bill_no}
                    onChange={handleSupplierChange}
                    placeholder="Enter bill number"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    name="purchase_date"
                    value={supplierForm.purchase_date}
                    onChange={handleSupplierChange}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-section note-section">
              <div className="section-mini-title">Items & Notes</div>
              <div className="form-group">
                <label>Product Details</label>
                <textarea
                  name="product_details"
                  value={supplierForm.product_details}
                  onChange={handleSupplierChange}
                  placeholder="What items were purchased (name, qty, price per unit)"
                />
              </div>

              <div className="form-group">
                <label>Note</label>
                <textarea
                  name="note"
                  value={supplierForm.note}
                  onChange={handleSupplierChange}
                  placeholder="Additional notes or reminders"
                />
              </div>
            </div>
          </div>

          <div className="supplier-form-actions">
            <span className="form-hint">Pending amount updates automatically from amount and paid amount.</span>
            <button className="primary-btn" type="submit" disabled={saving}>
              <FiSave />
              {saving ? "Saving..." : editingSupplierId ? "Update Purchase" : "Save Purchase"}
            </button>
          </div>
        </form>

        <div className="supplier-table-card">
          <div className="supplier-card-header">
            <div>
              <span className="section-label">Purchase records</span>
              <h2>Supplier Purchase History</h2>
              <p>{supplierPurchases.length} purchase records in this account.</p>
            </div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Supplier</th>
                  <th>Purchase From</th>
                  <th>Product(s)</th>
                  <th>Amount</th>
                  <th>Paid</th>
                  <th>Pending</th>
                  <th>Bill No</th>
                  <th>Date</th>
                  <th>Note</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="11" className="empty-cell">Loading purchases...</td>
                  </tr>
                ) : supplierPurchases.length > 0 ? (
                  supplierPurchases.map((item) => (
                    <tr key={item.id}>
                      <td data-label="ID">{item.id}</td>
                      <td data-label="Supplier">{item.supplier_name}</td>
                      <td data-label="Purchase From">{item.purchase_from || "-"}</td>
                      <td data-label="Product(s)">{item.product_details || "-"}</td>
                      <td data-label="Amount" className="amount">{formatMoney(item.amount)}</td>
                      <td data-label="Paid" className="amount">{formatMoney(item.paid_amount)}</td>
                      <td data-label="Pending" className="amount">{formatMoney(item.pending_amount)}</td>
                      <td data-label="Bill No">{item.bill_no}</td>
                      <td data-label="Date">{formatDate(item.purchase_date)}</td>
                      <td data-label="Note">{item.note || "-"}</td>
                      <td data-label="Action">
                        <div className="row-actions">
                          <button className="edit-btn" type="button" onClick={() => handleEditSupplier(item)}>
                            <FiEdit2 />
                            Edit
                          </button>
                          <button className="delete-btn" type="button" onClick={() => handleDeleteSupplier(item.id)}>
                            <FiTrash2 />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="11" className="empty-cell">No supplier purchases saved yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Supplier;
