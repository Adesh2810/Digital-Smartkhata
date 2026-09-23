import { useMemo, useState } from "react";
import {
  FaBoxOpen,
  FaCheck,
  FaClock,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaRegCreditCard,
  FaSearch,
  FaShoppingBag,
  FaTimes,
  FaTruck,
  FaUserCheck,
} from "react-icons/fa";
import "./Orders.css";

const initialOrders = [
  {
    id: 1,
    customer: "Amit Sharma",
    phone: "9876543210",
    address: "Wagholi, Pune",
    time: "10:30 AM",
    total: 1850,
    payment: "Cash",
    status: "Pending",
    products: [
      { name: "Rice 5kg", qty: 2 },
      { name: "Sugar 1kg", qty: 1 },
      { name: "Oil 1L", qty: 3 },
    ],
  },
  {
    id: 2,
    customer: "Ramesh Gupta",
    phone: "9988776655",
    address: "Kharadi, Pune",
    time: "11:15 AM",
    total: 950,
    payment: "UPI",
    status: "Accepted",
    products: [
      { name: "Milk", qty: 2 },
      { name: "Bread", qty: 4 },
      { name: "Butter", qty: 1 },
    ],
  },
  {
    id: 3,
    customer: "Suresh Patil",
    phone: "9012345678",
    address: "Viman Nagar",
    time: "12:05 PM",
    total: 1420,
    payment: "Online",
    status: "Ready",
    products: [
      { name: "Cold Drink", qty: 6 },
      { name: "Biscuits", qty: 5 },
      { name: "Chips", qty: 8 },
    ],
  },
];

const statusConfig = {
  Pending: {
    title: "Pending Orders",
    tone: "pending",
    icon: FaClock,
    action: "Needs approval",
  },
  Accepted: {
    title: "Accepted Orders",
    tone: "accepted",
    icon: FaUserCheck,
    action: "Packing queue",
  },
  Ready: {
    title: "Ready Orders",
    tone: "ready",
    icon: FaBoxOpen,
    action: "Ready to deliver",
  },
  Delivered: {
    title: "Delivered Orders",
    tone: "delivered",
    icon: FaTruck,
    action: "Completed",
  },
  Rejected: {
    title: "Rejected Orders",
    tone: "rejected",
    icon: FaTimes,
    action: "Cancelled",
  },
};

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function OrderCard({ order, onStatusChange }) {
  const itemCount = order.products.reduce((sum, product) => sum + product.qty, 0);

  return (
    <article className={`order-card ${order.status.toLowerCase()}-order`}>
      <div className="order-card-top">
        <div className="order-customer">
          <span className="order-avatar">{order.customer.charAt(0)}</span>
          <div>
            <p className="order-id">Order #{String(order.id).padStart(3, "0")}</p>
            <h3>{order.customer}</h3>
          </div>
        </div>
        <span className={`status-pill ${order.status.toLowerCase()}`}>{order.status}</span>
      </div>

      <div className="order-meta">
        <span><FaPhoneAlt /> {order.phone}</span>
        <span><FaMapMarkerAlt /> {order.address}</span>
        <span><FaClock /> {order.time}</span>
      </div>

      <div className="products-panel">
        <div className="products-title">
          <span><FaShoppingBag /> {itemCount} items</span>
          <b>{order.products.length} products</b>
        </div>
        {order.products.map((product) => (
          <div className="product-line" key={`${order.id}-${product.name}`}>
            <span>{product.name}</span>
            <strong>x{product.qty}</strong>
          </div>
        ))}
      </div>

      <div className="order-payment">
        <div>
          <span>Total Bill</span>
          <strong>{currency.format(order.total)}</strong>
        </div>
        <p><FaRegCreditCard /> {order.payment}</p>
      </div>

      <div className="order-actions">
        {order.status === "Pending" && (
          <>
            <button className="accept-btn" onClick={() => onStatusChange(order.id, "Accepted")}>
              <FaCheck /> Accept
            </button>
            <button className="reject-btn" onClick={() => onStatusChange(order.id, "Rejected")}>
              <FaTimes /> Reject
            </button>
          </>
        )}

        {order.status === "Accepted" && (
          <button className="ready-btn" onClick={() => onStatusChange(order.id, "Ready")}>
            <FaBoxOpen /> Mark Ready
          </button>
        )}

        {order.status === "Ready" && (
          <button className="parcel-btn" onClick={() => onStatusChange(order.id, "Delivered")}>
            <FaTruck /> Parcel Delivered
          </button>
        )}

        {order.status === "Delivered" && (
          <button className="done-btn" disabled>
            <FaCheck /> Delivered
          </button>
        )}

        {order.status === "Rejected" && (
          <button className="cancelled-btn" disabled>
            <FaTimes /> Rejected
          </button>
        )}
      </div>
    </article>
  );
}

function Orders() {
  const [orders, setOrders] = useState(initialOrders);
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("All");

  const updateStatus = (id, status) => {
    setOrders((prev) =>
      prev.map((order) => (order.id === id ? { ...order, status } : order))
    );
  };

  const dashboard = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    const searched = orders.filter((order) => {
      const searchable = `${order.customer} ${order.phone} ${order.address} ${order.payment}`.toLowerCase();
      return searchable.includes(normalized);
    });

    const filtered =
      activeStatus === "All"
        ? searched
        : searched.filter((order) => order.status === activeStatus);

    const grouped = Object.keys(statusConfig).reduce((acc, status) => {
      acc[status] = filtered.filter((order) => order.status === status);
      return acc;
    }, {});

    const totalRevenue = orders
      .filter((order) => order.status !== "Rejected")
      .reduce((sum, order) => sum + order.total, 0);

    return { filtered, grouped, totalRevenue };
  }, [activeStatus, orders, search]);

  return (
    <div className="orders-page">
      <header className="orders-hero">
        <div>
          <span className="orders-eyebrow">Today's orders</span>
          <h1>Orders Dashboard</h1>
          <p>Track every customer request from approval to parcel delivery.</p>
        </div>

        <div className="orders-search">
          <FaSearch />
          <input
            type="text"
            placeholder="Search customer, phone, address"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </header>

      <section className="order-summary">
        {Object.entries(statusConfig).map(([status, config]) => {
          const Icon = config.icon;
          return (
            <button
              className={`summary-card ${config.tone} ${activeStatus === status ? "active" : ""}`}
              key={status}
              onClick={() => setActiveStatus(activeStatus === status ? "All" : status)}
              type="button"
            >
              <span className="summary-icon"><Icon /></span>
              <span>
                <small>{config.action}</small>
                <strong>{dashboard.grouped[status]?.length || 0}</strong>
                <b>{status}</b>
              </span>
            </button>
          );
        })}
      </section>

      <section className="orders-toolbar">
        <div>
          <p>Visible orders</p>
          <strong>{dashboard.filtered.length}</strong>
        </div>
        <div>
          <p>Total order value</p>
          <strong>{currency.format(dashboard.totalRevenue)}</strong>
        </div>
        <button
          type="button"
          className={activeStatus === "All" ? "filter-chip active" : "filter-chip"}
          onClick={() => setActiveStatus("All")}
        >
          All Status
        </button>
      </section>

      <main className="orders-board">
        {Object.entries(statusConfig).map(([status, config]) => {
          const Icon = config.icon;
          const statusOrders = dashboard.grouped[status] || [];

          return (
            <section className={`orders-section ${config.tone}`} key={status}>
              <div className="section-heading">
                <div>
                  <span><Icon /></span>
                  <h2>{config.title}</h2>
                </div>
                <strong>{statusOrders.length}</strong>
              </div>

              <div className="orders-grid">
                {statusOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onStatusChange={updateStatus}
                  />
                ))}
              </div>

              {statusOrders.length === 0 && (
                <div className="empty-orders">
                  <FaShoppingBag />
                  <p>No {status.toLowerCase()} orders found</p>
                </div>
              )}
            </section>
          );
        })}
      </main>
    </div>
  );
}

export default Orders;
