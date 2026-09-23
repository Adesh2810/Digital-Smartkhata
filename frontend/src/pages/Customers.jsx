import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    addCustomerProductEntry,
    deleteCustomerProductEntry,
    getCustomerHistory,
    getCustomers,
    updateCustomerProductEntry,
} from "../services/customerService";
import "./Customers.css";

const emptyEntryForm = () => ({
    date: new Date().toISOString().slice(0, 10),
    product_name: "",
    quantity: 1,
    price: "",
    paid_amount: "",
    note: "",
});

const formatMoney = (value) =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
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

const toInputDate = (value) => (value ? String(value).slice(0, 10) : new Date().toISOString().slice(0, 10));

function Customers() {
    const navigate = useNavigate();
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [history, setHistory] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(false);
    const [showAddProduct, setShowAddProduct] = useState(false);
    const [editingEntryId, setEditingEntryId] = useState(null);
    const [savingProduct, setSavingProduct] = useState(false);
    const [saveError, setSaveError] = useState("");
    const [entryForm, setEntryForm] = useState(emptyEntryForm);

    const fetchCustomers = async (preferredCustomerId) => {
        try {
            const response = await getCustomers();
            const list = response.data || [];
            setCustomers(list);

            if (list.length === 0) {
                setSelectedCustomer(null);
                return;
            }

            setSelectedCustomer((current) => {
                const targetId = preferredCustomerId || current?.id || list[0].id;
                return list.find((customer) => String(customer.id) === String(targetId)) || list[0];
            });
        } catch (error) {
            console.log(error);
        }
    };

    const fetchCustomerHistory = async (customerId) => {
        setLoading(true);
        try {
            const response = await getCustomerHistory(customerId);
            setHistory(response.data || []);
        } catch (error) {
            console.log("Error fetching history:", error);
            setHistory([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchCustomers();
    }, []);

    useEffect(() => {
        if (selectedCustomer) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            fetchCustomerHistory(selectedCustomer.id);
        }
    }, [selectedCustomer]);

    const filteredCustomers = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        if (!query) return customers;

        return customers.filter((customer) =>
            [customer.customer_name, customer.mobile]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(query))
        );
    }, [customers, searchTerm]);

    const totalPending = useMemo(
        () => customers.reduce((sum, customer) => sum + Number(customer.current_balance || 0), 0),
        [customers]
    );

    const totalPaid = useMemo(
        () =>
            customers.reduce((sum, customer) => {
                const opening = Number(customer.opening_balance || 0);
                const current = Number(customer.current_balance || 0);
                return sum + Math.max(opening - current, 0);
            }, 0),
        [customers]
    );

    const selectedPaid = Math.max(
        Number(selectedCustomer?.opening_balance || 0) - Number(selectedCustomer?.current_balance || 0),
        0
    );
    const selectedPending = Number(selectedCustomer?.current_balance || 0);
    const totalProductAmount = Number(entryForm.quantity || 0) * Number(entryForm.price || 0);
    const pendingAmount = Number((totalProductAmount - Number(entryForm.paid_amount || 0)).toFixed(2));

    const resetProductForm = () => {
        setEditingEntryId(null);
        setEntryForm(emptyEntryForm());
        setSaveError("");
    };

    const openProductForm = (customer = selectedCustomer) => {
        if (!customer) return;
        setSelectedCustomer(customer);
        resetProductForm();
        setShowAddProduct(true);
    };

    const closeProductForm = () => {
        setShowAddProduct(false);
        resetProductForm();
    };

    const handleEntryChange = (field, value) => {
        setEntryForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleSaveProductEntry = async () => {
        if (!selectedCustomer) return;
        setSavingProduct(true);
        setSaveError("");

        const payload = {
            date: entryForm.date,
            product_name: entryForm.product_name,
            quantity: entryForm.quantity,
            price: entryForm.price,
            paid_amount: entryForm.paid_amount,
            note: entryForm.note,
        };

        try {
            const response = editingEntryId
                ? await updateCustomerProductEntry(selectedCustomer.id, editingEntryId, payload)
                : await addCustomerProductEntry(selectedCustomer.id, payload);

            if (response?.data?.success) {
                await fetchCustomers(selectedCustomer.id);
                await fetchCustomerHistory(selectedCustomer.id);
                closeProductForm();
            } else {
                setSaveError(response?.data?.message || "Unable to save product entry.");
            }
        } catch (error) {
            console.error(error);
            setSaveError(error?.response?.data?.message || "Server error while saving product entry.");
        } finally {
            setSavingProduct(false);
        }
    };

    const handleEditProductEntry = (entry) => {
        setEditingEntryId(entry.id);
        setEntryForm({
            date: toInputDate(entry.date),
            product_name: entry.product_name || "",
            quantity: entry.quantity || 1,
            price: entry.price || "",
            paid_amount: entry.paid_amount || "",
            note: entry.note || "",
        });
        setShowAddProduct(true);
        setSaveError("");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleDeleteProductEntry = async (entry) => {
        if (!selectedCustomer || !window.confirm("Delete this product entry?")) return;

        try {
            await deleteCustomerProductEntry(selectedCustomer.id, entry.id);
            await fetchCustomers(selectedCustomer.id);
            await fetchCustomerHistory(selectedCustomer.id);
        } catch (error) {
            console.log(error);
            alert(error?.response?.data?.message || "Product entry delete failed.");
        }
    };

    const handlePaidClick = (customer, event) => {
        event.stopPropagation();
        navigate("/payment", { state: { customerId: customer.id } });
    };

    const handlePendingClick = (customer, event) => {
        event.stopPropagation();
        openProductForm(customer);
    };

    return (
        <div className="customer-page">
            <div className="customer-header">
                <div>
                    <h1>Customer Management</h1>
                    <p>Manage customer records, balances, product entries, and history.</p>
                </div>
                <button className="add-btn" type="button" onClick={() => navigate("/add-customer")}>
                    + Add Customer
                </button>
            </div>

            <div className="customer-summary-grid">
                <div className="summary-card">
                    <div>
                        <h4>Total Customers</h4>
                        <h2>{customers.length}</h2>
                    </div>
                </div>
                <div className="summary-card">
                    <div>
                        <h4>Paid Amount</h4>
                        <h2 className="paid-text">{formatMoney(totalPaid)}</h2>
                    </div>
                </div>
                <div className="summary-card">
                    <div>
                        <h4>Pending Amount</h4>
                        <h2 className="pending-text">{formatMoney(totalPending)}</h2>
                    </div>
                </div>
            </div>

            <div className="customer-main-container">
                <aside className="customer-sidebar">
                    <div className="sidebar-header">
                        <h2>Customer List</h2>
                        <input
                            type="text"
                            placeholder="Search customer..."
                            className="search-box"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                        />
                    </div>

                    <div className="customers-list">
                        {filteredCustomers.length > 0 ? (
                            filteredCustomers.map((customer) => (
                                <button
                                    key={customer.id}
                                    className={`customer-card ${selectedCustomer?.id === customer.id ? "active" : ""}`}
                                    type="button"
                                    onClick={() => setSelectedCustomer(customer)}
                                >
                                    <span className="customer-logo">A</span>
                                    <span className="customer-card-name">{customer.customer_name}</span>
                                    <span className="customer-quick-actions">
                                        <span className="mini-action paid" onClick={(event) => handlePaidClick(customer, event)}>
                                            <span>Paid</span>
                                            <small>{formatMoney(Math.max(Number(customer.opening_balance || 0) - Number(customer.current_balance || 0), 0))}</small>
                                        </span>
                                        <span className="mini-action pending" onClick={(event) => handlePendingClick(customer, event)}>
                                            <span>Pending</span>
                                            <small>{formatMoney(customer.current_balance)}</small>
                                        </span>
                                    </span>
                                </button>
                            ))
                        ) : (
                            <div className="no-customers">No customers found</div>
                        )}
                    </div>
                </aside>

                <main className="customer-details">
                    {selectedCustomer ? (
                        <>
                            <section className="details-header">
                                <div className="customer-details-info">
                                    <div className="details-title-row">
                                        <span className="customer-logo large">A</span>
                                        <div>
                                            <h2>{selectedCustomer.customer_name}</h2>
                                            <p>{selectedCustomer.mobile || "Mobile not available"}</p>
                                        </div>
                                    </div>

                                    <div className="customer-extra-details">
                                        <p>
                                            <strong>Aadhaar:</strong> {selectedCustomer.aadhar_number || "Not available"}
                                        </p>
                                        <p>
                                            <strong>Address:</strong> {selectedCustomer.address || "Not available"}
                                        </p>
                                    </div>
                                </div>

                                <div className="details-side-panel">
                                    <div className="customer-balance-box">
                                        <div className="balance-item">
                                            <span className="balance-label">Paid Amount</span>
                                            <h3 className="paid-color">{formatMoney(selectedPaid)}</h3>
                                        </div>
                                        <div className="balance-item">
                                            <span className="balance-label">Pending Amount</span>
                                            <h3 className="pending-color">{formatMoney(selectedPending)}</h3>
                                        </div>
                                    </div>

                                    <div className="details-actions">
                                        <button className="history-btn primary" type="button" onClick={() => openProductForm()}>
                                            + Add Product
                                        </button>
                                        <button
                                            className="edit-customer-btn"
                                            type="button"
                                            onClick={() => navigate("/add-customer", { state: { customer: selectedCustomer } })}
                                        >
                                            Edit Customer
                                        </button>
                                    </div>
                                </div>
                            </section>

                            {showAddProduct && (
                                <section className="product-entry-panel">
                                    <div className="product-entry-header">
                                        <div>
                                            <p className="customer-subtitle">
                                                {editingEntryId ? "Edit product entry" : "Add product entry"}
                                            </p>
                                            <h3>{selectedCustomer.customer_name}</h3>
                                        </div>
                                    </div>

                                    <div className="product-entry-form">
                                        <div className="product-entry-grid">
                                            <label className="form-group">
                                                Date
                                                <input
                                                    type="date"
                                                    className="form-input"
                                                    value={entryForm.date}
                                                    onChange={(event) => handleEntryChange("date", event.target.value)}
                                                />
                                            </label>
                                            <label className="form-group">
                                                Product Name
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={entryForm.product_name}
                                                    onChange={(event) => handleEntryChange("product_name", event.target.value)}
                                                    placeholder="Enter product name"
                                                />
                                            </label>
                                            <label className="form-group">
                                                Quantity
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    min="1"
                                                    value={entryForm.quantity}
                                                    onChange={(event) => handleEntryChange("quantity", event.target.value)}
                                                />
                                            </label>
                                            <label className="form-group">
                                                Price
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    min="0"
                                                    step="0.01"
                                                    value={entryForm.price}
                                                    onChange={(event) => handleEntryChange("price", event.target.value)}
                                                    placeholder="0.00"
                                                />
                                            </label>
                                            <label className="form-group">
                                                Paid Amount
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    min="0"
                                                    step="0.01"
                                                    value={entryForm.paid_amount}
                                                    onChange={(event) => handleEntryChange("paid_amount", event.target.value)}
                                                    placeholder="0.00"
                                                />
                                            </label>
                                            <label className="form-group">
                                                Pending Amount
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={formatMoney(Math.max(pendingAmount, 0))}
                                                    readOnly
                                                />
                                            </label>
                                        </div>

                                        <label className="form-group">
                                            Note
                                            <textarea
                                                className="form-textarea"
                                                value={entryForm.note}
                                                onChange={(event) => handleEntryChange("note", event.target.value)}
                                                placeholder="Optional note"
                                            />
                                        </label>

                                        <div className="entry-summary">
                                            <div className="entry-summary-item">
                                                <span>Total</span>
                                                <strong>{formatMoney(totalProductAmount)}</strong>
                                            </div>
                                            <div className="entry-summary-item">
                                                <span>Paid</span>
                                                <strong>{formatMoney(entryForm.paid_amount)}</strong>
                                            </div>
                                            <div className="entry-summary-item">
                                                <span>Pending</span>
                                                <strong>{formatMoney(Math.max(pendingAmount, 0))}</strong>
                                            </div>
                                        </div>

                                        {saveError && <div className="form-error">{saveError}</div>}

                                        <div className="form-actions">
                                            <button className="cancel-btn" type="button" onClick={closeProductForm}>
                                                Cancel
                                            </button>
                                            <button
                                                className="save-btn"
                                                type="button"
                                                onClick={handleSaveProductEntry}
                                                disabled={savingProduct}
                                            >
                                                {savingProduct ? "Saving..." : editingEntryId ? "Update Entry" : "Save Entry"}
                                            </button>
                                        </div>
                                    </div>
                                </section>
                            )}

                            <section className="transaction-history">
                                <div className="history-title-row">
                                    <div>
                                        <h3>Customer History</h3>
                                        <p>Full history appears automatically when a customer is selected.</p>
                                    </div>
                                    <span>{history.length} records</span>
                                </div>

                                {loading ? (
                                    <p className="loading">Loading history...</p>
                                ) : history.length > 0 ? (
                                    <div className="transaction-table">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Product</th>
                                                    <th>Price</th>
                                                    <th>Qty</th>
                                                    <th>Paid</th>
                                                    <th>Pending</th>
                                                    <th>Status</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {history.map((entry, index) => (
                                                    <tr key={`${entry.type}-${entry.id}-${index}`}>
                                                        <td data-label="Date">{formatDate(entry.date)}</td>
                                                        <td data-label="Product">
                                                            <strong>{entry.product_name || "-"}</strong>
                                                            <span className="row-type">{entry.type?.replace("_", " ") || "record"}</span>
                                                        </td>
                                                        <td data-label="Price">{formatMoney(entry.price)}</td>
                                                        <td data-label="Qty">{entry.quantity || 0}</td>
                                                        <td data-label="Paid" className="paid-color">{formatMoney(entry.paid_amount)}</td>
                                                        <td data-label="Pending" className="pending-color">{formatMoney(entry.pending_amount)}</td>
                                                        <td data-label="Status">
                                                            <span className={`status ${String(entry.status).toLowerCase()}`}>
                                                                {entry.status || "Pending"}
                                                            </span>
                                                        </td>
                                                        <td data-label="Action">
                                                            {entry.type === "product_entry" ? (
                                                                <div className="table-actions">
                                                                    <button
                                                                        className="edit-btn"
                                                                        type="button"
                                                                        onClick={() => handleEditProductEntry(entry)}
                                                                    >
                                                                        Edit Product
                                                                    </button>
                                                                    <button
                                                                        className="delete-btn"
                                                                        type="button"
                                                                        onClick={() => handleDeleteProductEntry(entry)}
                                                                    >
                                                                        Delete
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <span className="muted-action">-</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="no-transactions">No history found for this customer.</p>
                                )}
                            </section>
                        </>
                    ) : (
                        <div className="no-selection">
                            <p>Select a customer to view details.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

export default Customers;
