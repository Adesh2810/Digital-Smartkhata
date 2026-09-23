import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import "./Payment.css";

import {
  addPayment,
  deletePayment,
  getPaymentCustomers,
  getPaymentSummary,
  getPayments,
  updatePayment,
} from "./paymentService";

const todayInput = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
  customer_id: "",
  amount: "",
  payment_date: todayInput(),
  payment_method: "Cash",
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
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const toInputDate = (value) => (value ? String(value).slice(0, 10) : todayInput());

function Payment() {
  const location = useLocation();
  const [customers, setCustomers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({
    total_collection: 0,
    today_collection: 0,
    pending_recovery: 0,
    total_payments: 0,
    trend: [],
    top_customers: [],
    recent_payments: [],
  });
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadPaymentPage = async () => {
    try {
      setLoading(true);
      setError("");

      const [customerData, paymentData, summaryData] = await Promise.all([
        getPaymentCustomers(),
        getPayments(),
        getPaymentSummary(),
      ]);

      setCustomers(customerData);
      setPayments(paymentData);
      setSummary(summaryData);
    } catch (err) {
      console.log(err);
      setError("Unable to load payment data. Please check backend and database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPaymentPage();
  }, []);

  useEffect(() => {
    const customerId = location.state?.customerId;
    if (!customerId || customers.length === 0) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm((current) => ({
      ...current,
      customer_id: String(customerId),
    }));
  }, [customers, location.state?.customerId]);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => String(customer.id) === String(form.customer_id)),
    [customers, form.customer_id]
  );

  const balancePreview = useMemo(() => {
    const previousBalance = Number(selectedCustomer?.current_balance || 0);
    const amount = Number(form.amount || 0);
    const currentBalance = Math.max(previousBalance - amount, 0);

    return {
      previousBalance,
      amount,
      currentBalance,
    };
  }, [selectedCustomer, form.amount]);

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return payments;

    return payments.filter((payment) =>
      [payment.customer_name, payment.payment_method, payment.note]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [payments, search]);

  const trendMax = useMemo(
    () => Math.max(...(summary.trend || []).map((item) => Number(item.amount || 0)), 1),
    [summary.trend]
  );

  const handleChange = (event) => {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  };

  const showSuccess = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 2500);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      if (editingId) {
        await updatePayment(editingId, form);
        showSuccess("Payment updated and customer balance recalculated.");
      } else {
        await addPayment(form);
        showSuccess("Payment saved and customer balance updated.");
      }

      resetForm();
      await loadPaymentPage();
    } catch (err) {
      console.log(err);
      setError(err.response?.data?.message || "Payment save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (payment) => {
    setEditingId(payment.id);
    setForm({
      customer_id: payment.customer_id || "",
      amount: payment.amount || "",
      payment_date: toInputDate(payment.payment_date),
      payment_method: payment.payment_method || "Cash",
      note: payment.note || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this payment and restore customer balance?")) return;

    try {
      setError("");
      await deletePayment(id);
      showSuccess("Payment deleted and balance restored.");
      await loadPaymentPage();
    } catch (err) {
      console.log(err);
      setError(err.response?.data?.message || "Payment delete failed.");
    }
  };

  return (
    <div className="payment-page">
      <div className="payment-header">
        <div>
          <h1>Payment Module</h1>
          <p>Collections, recoveries, balances, and payment history</p>
        </div>

      </div>

      {(message || error) && (
        <div className={error ? "payment-notice error" : "payment-notice success"}>
          {error || message}
        </div>
      )}

      <div className="payment-stats">
        <div className="payment-stat-card">
          <span>Total Collection</span>
          <strong>{formatMoney(summary.total_collection)}</strong>
          <small>All received payments</small>
        </div>

        <div className="payment-stat-card">
          <span>Today's Collection</span>
          <strong>{formatMoney(summary.today_collection)}</strong>
          <small>Received today</small>
        </div>

        <div className="payment-stat-card danger">
          <span>Pending Recovery</span>
          <strong>{formatMoney(summary.pending_recovery)}</strong>
          <small>Customer balance pending</small>
        </div>

        <div className="payment-stat-card">
          <span>Total Payments</span>
          <strong>{summary.total_payments}</strong>
          <small>Payment entries</small>
        </div>
      </div>

      <div className="payment-grid">
        <section className="payment-form-card">
          <div className="form-title-row">
            <h2>{editingId ? "Edit Payment Entry" : "Add Payment Entry"}</h2>
            {editingId && (
              <button className="cancel-edit-btn" type="button" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <label className="form-group">
                Customer Select
                <select
                  name="customer_id"
                  value={form.customer_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.customer_name} - Balance {formatMoney(customer.current_balance)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form-group">
                Payment Amount
                <input
                  type="number"
                  name="amount"
                  value={form.amount}
                  onChange={handleChange}
                  placeholder="Enter amount"
                  min="1"
                  required
                />
              </label>

              <label className="form-group">
                Date
                <input
                  type="date"
                  name="payment_date"
                  value={form.payment_date}
                  onChange={handleChange}
                  required
                />
              </label>

              <label className="form-group">
                Payment Mode
                <select
                  name="payment_method"
                  value={form.payment_method}
                  onChange={handleChange}
                  required
                >
                  <option>Cash</option>
                  <option>UPI</option>
                  <option>Bank Transfer</option>
                  <option>Cheque</option>
                  <option>Card</option>
                </select>
              </label>
            </div>

            <label className="form-group">
              Note
              <textarea
                name="note"
                rows="4"
                value={form.note}
                onChange={handleChange}
                placeholder="Optional note"
              />
            </label>

            <button type="submit" className="save-payment-btn" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update Payment" : "Save Payment"}
            </button>
          </form>
        </section>

        <aside className="balance-card">
          <h2>Auto Balance Update</h2>

          <div className="balance-customer">
            <span>{selectedCustomer?.customer_name || "Select a customer"}</span>
            <small>{selectedCustomer?.mobile || "Balance preview"}</small>
          </div>

          <div className="balance-item">
            <span>Previous Balance</span>
            <b>{formatMoney(balancePreview.previousBalance)}</b>
          </div>

          <div className="balance-item">
            <span>Payment</span>
            <b className="green">{formatMoney(balancePreview.amount)}</b>
          </div>

          <div className="balance-item">
            <span>New Balance</span>
            <b className="pending">{formatMoney(balancePreview.currentBalance)}</b>
          </div>
        </aside>
      </div>

      <div className="payment-insights">
        <section className="recent-payments">
          <h2>Recent Payments</h2>
          <div className="recent-list">
            {summary.recent_payments?.length ? (
              summary.recent_payments.map((payment) => (
                <div className="recent-row" key={payment.id}>
                  <div>
                    <strong>{payment.customer_name}</strong>
                    <span>{formatDate(payment.payment_date)} - {payment.payment_method || "Cash"}</span>
                  </div>
                  <b>{formatMoney(payment.amount)}</b>
                </div>
              ))
            ) : (
              <div className="empty-panel">No recent payments</div>
            )}
          </div>
        </section>

        <section className="trend-panel">
          <h2>Payment Trend Graph</h2>
          <div className="trend-bars">
            {summary.trend?.map((item) => (
              <div className="trend-bar-item" key={item.payment_date}>
                <div className="trend-bar-track">
                  <span style={{ height: `${Math.max((Number(item.amount) / trendMax) * 100, 4)}%` }} />
                </div>
                <small>{formatDate(item.payment_date).slice(0, 6)}</small>
                <b>{formatMoney(item.amount)}</b>
              </div>
            ))}
          </div>
        </section>

        <section className="top-customers">
          <h2>Top Recovery Customers</h2>
          <div className="top-list">
            {summary.top_customers?.length ? (
              summary.top_customers.map((customer) => (
                <div className="top-row" key={`${customer.customer_id}-${customer.customer_name}`}>
                  <div>
                    <strong>{customer.customer_name}</strong>
                    <span>{customer.payment_count} payments</span>
                  </div>
                  <b>{formatMoney(customer.total_paid)}</b>
                </div>
              ))
            ) : (
              <div className="empty-panel">No recovery data</div>
            )}
          </div>
        </section>
      </div>

      <section className="payment-history">
        <div className="history-top">
          <h2>Payment History Table</h2>

          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search customer, mode, note..."
          />
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Amount</th>
                <th>Previous Balance</th>
                <th>Current Balance</th>
                <th>Date</th>
                <th>Payment Mode</th>
                <th>Note</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="empty-cell">
                    Loading payments...
                  </td>
                </tr>
              ) : filteredPayments.length > 0 ? (
                filteredPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td data-label="Customer">{payment.customer_name}</td>
                    <td data-label="Amount" className="green">{formatMoney(payment.amount)}</td>
                    <td data-label="Previous Balance">{formatMoney(payment.previous_balance)}</td>
                    <td data-label="Current Balance" className="pending">{formatMoney(payment.current_balance)}</td>
                    <td data-label="Date">{formatDate(payment.payment_date)}</td>
                    <td data-label="Payment Mode">{payment.payment_method || "Cash"}</td>
                    <td data-label="Note">{payment.note || "-"}</td>
                    <td data-label="Action">
                      <div className="table-actions">
                        <button className="edit-btn" type="button" onClick={() => handleEdit(payment)}>
                          Edit
                        </button>

                        <button className="delete-btn" type="button" onClick={() => handleDelete(payment.id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="empty-cell">
                    No payment records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default Payment;
