import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  FaBoxOpen,
  FaClipboardList,
  FaCreditCard,
  FaExclamationTriangle,
  FaMoneyBillWave,
  FaShoppingBag,
  FaTruck,
  FaUserPlus,
  FaUsers,
  FaWallet,
} from "react-icons/fa";

import { getCredits } from "./customerCreditService";
import { getInventoryProducts } from "../services/inventoryService";
import { getPayments } from "./paymentService";
import { getShoppingOrders } from "../services/shoppingService";
import { getCustomers } from "../services/customerService";
import "./Dashboard.css";

const fallbackTransactions = [
  { id: "t1", name: "Amit Sharma", type: "Credit", amount: 5000, date: "2026-06-13", status: "Pending" },
  { id: "t2", name: "Ramesh Gupta", type: "Payment", amount: 3000, date: "2026-06-12", status: "Completed" },
  { id: "t3", name: "Suresh Yadav", type: "Credit", amount: 2500, date: "2026-06-11", status: "Pending" },
  { id: "t4", name: "ajay patil", type: "Payment", amount: 4500, date: "2026-06-10", status: "Completed" },
  { id: "t5", name: "Nikil pandey", type: "Credit", amount: 7000, date: "2026-06-09", status: "Pending" },
  { id: "t6", name: "Vikas Kumar", type: "Order", amount: 6200, date: "2026-06-08", status: "Processing" },
];

const fallbackProducts = [
  { name: "Tata Salt", sales: 96 },
  { name: "Parle G", sales: 88 },
  { name: "Colgate", sales: 74 },
  { name: "Aashirvaad", sales: 68 },
  { name: "Maggi", sales: 63 },
  { name: "Dove Soap", sales: 55 },
  { name: "Surf Excel", sales: 48 },
  { name: "Red Label", sales: 39 },
  { name: "Good Day", sales: 33 },
  { name: "Clinic Plus", sales: 26 },
];

const summaryRanges = {
  week: {
    label: "Week",
    title: "Week Wise Business Overview",
    total: 146800,
    unit: "Business",
    data: [
      { label: "Mon", value: 18200 },
      { label: "Tue", value: 22400 },
      { label: "Wed", value: 19600 },
      { label: "Thu", value: 31800 },
      { label: "Fri", value: 34200 },
      { label: "Sat", value: 27400 },
      { label: "Sun", value: 23800 },
    ],
  },
  month: {
    label: "Monthly",
    title: "Monthly Business Overview",
    total: 584000,
    unit: "Business",
    data: Array.from({ length: 31 }, (_, index) => {
      const day = index + 1;
      const wave = Math.round(9000 + Math.sin(day / 2.4) * 3200 + (day % 6) * 1200);
      return { label: String(day), value: Math.max(wave, 4200) };
    }),
  },
  year: {
    label: "Yearly",
    title: "Yearly Business Overview",
    total: 6820000,
    unit: "Business",
    data: [
      { label: "Jan", value: 420000 },
      { label: "Feb", value: 510000 },
      { label: "Mar", value: 620000 },
      { label: "Apr", value: 580000 },
      { label: "May", value: 720000 },
      { label: "Jun", value: 690000 },
      { label: "Jul", value: 760000 },
      { label: "Aug", value: 710000 },
      { label: "Sep", value: 640000 },
      { label: "Oct", value: 570000 },
      { label: "Nov", value: 520000 },
      { label: "Dec", value: 680000 },
    ],
  },
};

const fallbackLowStock = [
  { product: "Tata Salt", stock: 2 },
  { product: "Colgate", stock: 1 },
  { product: "Parle G", stock: 4 },
];

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

const formatDate = (date) => {
  if (!date) return "Today";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return String(date);

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
};

const getArrayData = (result) => {
  if (result.status !== "fulfilled") return [];
  const value = result.value?.data ?? result.value;
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.products)) return value.products;
  if (Array.isArray(value?.orders)) return value.orders;
  if (Array.isArray(value?.customers)) return value.customers;
  return [];
};

const getNumber = (...values) => {
  const found = values.find((value) => value !== undefined && value !== null && value !== "");
  return Number(found) || 0;
};

function Dashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [activeAmount, setActiveAmount] = useState(null);
  const [summaryRange, setSummaryRange] = useState("week");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dashboardData, setDashboardData] = useState({
    customers: [],
    credits: [],
    payments: [],
    orders: [],
    products: [],
    loading: true,
  });

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      const [customersResult, creditsResult, paymentsResult, ordersResult, productsResult] =
        await Promise.allSettled([
          getCustomers(),
          getCredits(),
          getPayments(),
          getShoppingOrders(),
          getInventoryProducts(),
        ]);

      if (!isMounted) return;

      setDashboardData({
        customers: getArrayData(customersResult),
        credits: getArrayData(creditsResult),
        payments: getArrayData(paymentsResult),
        orders: getArrayData(ordersResult),
        products: getArrayData(productsResult),
        loading: false,
      });
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const creditTotal = useMemo(() => {
    const total = dashboardData.credits.reduce(
      (sum, item) => sum + getNumber(item.amount, item.credit_amount, item.total_amount),
      0
    );

    return total || 245000;
  }, [dashboardData.credits]);

  const paymentTotal = useMemo(() => {
    const total = dashboardData.payments.reduce(
      (sum, item) => sum + getNumber(item.amount, item.payment_amount, item.paid_amount),
      0
    );

    return total || 175000;
  }, [dashboardData.payments]);

  const pendingTotal = Math.max(creditTotal - paymentTotal, 0);
  const totalAmount = Math.max(creditTotal, paymentTotal + pendingTotal, 1);
  const paidPercentage = Math.round((paymentTotal / totalAmount) * 100);
  const pendingPercentage = Math.max(100 - paidPercentage, 0);

  const transactions = useMemo(() => {
    const creditRows = dashboardData.credits.map((item, index) => ({
      id: `credit-${item.id ?? index}`,
      name: item.customer_name || item.name || item.supplier_name || "Credit Customer",
      type: "Credit",
      amount: getNumber(item.amount, item.credit_amount, item.total_amount),
      date: item.credit_date || item.date || item.created_at,
      status: "Pending",
    }));

    const paymentRows = dashboardData.payments.map((item, index) => ({
      id: `payment-${item.id ?? index}`,
      name: item.customer_name || item.name || "Payment Customer",
      type: "Payment",
      amount: getNumber(item.amount, item.payment_amount, item.paid_amount),
      date: item.payment_date || item.date || item.created_at,
      status: "Completed",
    }));

    const orderRows = dashboardData.orders.map((item, index) => ({
      id: `order-${item.id ?? index}`,
      name: item.customer_name || item.customer || item.name || "Order",
      type: "Order",
      amount: getNumber(item.total_amount, item.amount, item.grand_total),
      date: item.order_date || item.date || item.created_at,
      status: item.status || "Processing",
    }));

    const rows = [...creditRows, ...paymentRows, ...orderRows]
      .filter((item) => item.amount > 0)
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    return rows.length ? rows : fallbackTransactions;
  }, [dashboardData.credits, dashboardData.orders, dashboardData.payments]);

  const topProducts = useMemo(() => {
    const productMap = new Map();

    dashboardData.products.forEach((item) => {
      const name = item.product_name || item.name || item.title;
      if (!name) return;
      productMap.set(name, {
        name,
        sales: getNumber(item.sales_count, item.sold_count, item.quantity_sold, item.total_sold),
      });
    });

    dashboardData.orders.forEach((item) => {
      const name = item.product_name || item.product || item.item_name;
      if (!name) return;
      const current = productMap.get(name) || { name, sales: 0 };
      productMap.set(name, {
        name,
        sales: current.sales + getNumber(item.quantity, item.qty, item.items_count, 1),
      });
    });

    const products = [...productMap.values()]
      .filter((item) => item.sales > 0)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10);

    return products.length ? products : fallbackProducts;
  }, [dashboardData.orders, dashboardData.products]);

  const lowStock = useMemo(() => {
    const stockRows = dashboardData.products
      .map((item) => ({
        product: item.product_name || item.name || "Product",
        stock: getNumber(item.stock, item.quantity, item.available_stock),
      }))
      .filter((item) => item.stock <= 5)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 3);

    return stockRows.length ? stockRows : fallbackLowStock;
  }, [dashboardData.products]);


  const topPendingCustomers = [
  {
    name: "Amit Sharma",
    amount: "₹20,000",
  },
  {
    name: "Ramesh Gupta",
    amount: "₹18,500",
  },
  {
    name: "Suresh Patil",
    amount: "₹15,000",
  },
  {
    name: "Rahul Jadhav",
    amount: "₹12,800",
  },
  {
    name: "Akshay More",
    amount: "₹10,200",
  },
];

  const activityData = [
    { title: "New Customers", value: dashboardData.customers.length || 125 },
    { title: "Credits Added", value: dashboardData.credits.length || 10 },
    { title: "Payments Received", value: dashboardData.payments.length || 8 },
    { title: "Orders Placed", value: dashboardData.orders.length || 12 },
  ];

  const maxProductSales = Math.max(...topProducts.map((item) => item.sales), 1);
  const selectedSummary = summaryRanges[summaryRange];
  const selectedSummaryTotal = formatCurrency(selectedSummary.total);
  const liveTime = currentTime.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  const liveDate = currentTime.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

  const filteredTransactions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const matchesType =
        typeFilter === "All" || transaction.type === typeFilter;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        transaction.name.toLowerCase().includes(normalizedSearch) ||
        transaction.type.toLowerCase().includes(normalizedSearch) ||
        transaction.status.toLowerCase().includes(normalizedSearch);

      return matchesType && matchesSearch;
    });
  }, [searchTerm, transactions, typeFilter]);

  const visibleTransactions = showAllTransactions
    ? filteredTransactions
    : filteredTransactions.slice(0, 5);

  const handleAmountHover = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const angle = Math.atan2(event.clientY - centerY, event.clientX - centerX);
    const clockwiseFromTop = ((angle * 180) / Math.PI + 450) % 360;

    setActiveAmount(clockwiseFromTop <= paidPercentage * 3.6 ? "paid" : "pending");
  };

  const amountTooltip = activeAmount === "paid"
    ? `Paid: ${paidPercentage}% (${formatCurrency(paymentTotal)})`
    : activeAmount === "pending"
      ? `Pending: ${pendingPercentage}% (${formatCurrency(pendingTotal)})`
      : "Hover paid or pending section";

  return (
    <div className="dashboard-page">
      <header className="dashboard-title dashboard-hero">
        <div className="dashboard-hero-copy">
          <span className="dashboard-eyebrow">Business overview</span>
          <h1>Good day, Adesh</h1>
          <p>Keep an eye on payments, customers, orders, and stock from one place.</p>
        </div>

        <div className="dashboard-hero-meta">
          <span className="dashboard-live-label">Live business view</span>
          <div className="dashboard-time" aria-label={`Live time ${liveTime}`}>
            <span>{liveTime}</span>
            <small>{liveDate}</small>
          </div>
        </div>
      </header>

      <div className="cards">
        <div className="card customer-metric">
          <div className="card-topline">
            <span className="card-icon-wrap">
              <FaUsers className="card-icon" />
            </span>
            <span className="card-chip">Customers</span>
          </div>
          <div>
            <h3>Total Customers</h3>
            <h1>{dashboardData.customers.length || 125}</h1>
          </div>
          <small>Active customer base</small>
        </div>

        <div className="card credit-metric">
          <div className="card-topline">
            <span className="card-icon-wrap">
              <FaWallet className="card-icon" />
            </span>
            <span className="card-chip">Credit</span>
          </div>
          <div>
            <h3>Total Credit</h3>
            <h1>{formatCurrency(creditTotal)}</h1>
          </div>
          <small>Supplier and customer credit</small>
        </div>

        <div className="card payment-metric">
          <div className="card-topline">
            <span className="card-icon-wrap">
              <FaMoneyBillWave className="card-icon success" />
            </span>
            <span className="card-chip">Recovered</span>
          </div>
          <div>
            <h3>Total Payment</h3>
            <h1>{formatCurrency(paymentTotal)}</h1>
          </div>
          <small>{paidPercentage}% recovered</small>
        </div>

        <div className="card pending-metric">
          <div className="card-topline">
            <span className="card-icon-wrap">
              <FaExclamationTriangle className="card-icon warning" />
            </span>
            <span className="card-chip">Pending</span>
          </div>
          <div>
            <h3>Pending Balance</h3>
            <h1>{formatCurrency(pendingTotal || 70000)}</h1>
          </div>
          <small>Needs follow up</small>
        </div>
      </div>

      <div className="dashboard-main-grid">
        <section className="dashboard-panel transaction-panel">
          <div className="section-header">
            <div>
              <h2>Recent Transactions</h2>
              <p>Search, filter and review the latest business movement.</p>
            </div>

            <div className="header-actions">
              <input
                type="text"
                placeholder="Search customer or status"
                className="search-input"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />

              <select
                className="filter-select"
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
              >
                <option>All</option>
                <option>Credit</option>
                <option>Payment</option>
                <option>Order</option>
              </select>

              <button
                type="button"
                onClick={() => setShowAllTransactions((current) => !current)}
              >
                {showAllTransactions ? "Show Less" : "View All"}
              </button>
            </div>
          </div>

          <div className="transaction-list">
            {visibleTransactions.map((transaction) => (
              <div className="transaction-row" key={transaction.id}>
                <div className={`transaction-type ${transaction.type.toLowerCase()}`}>
                  {transaction.type === "Payment" ? <FaMoneyBillWave /> : transaction.type === "Order" ? <FaShoppingBag /> : <FaCreditCard />}
                </div>

                <div className="transaction-info">
                  <strong>{transaction.name}</strong>
                  <span>{transaction.type} - {formatDate(transaction.date)}</span>
                </div>

                <span className={`status-pill ${transaction.status.toLowerCase()}`}>
                  {transaction.status}
                </span>

                <b className={transaction.type === "Payment" ? "green" : "red"}>
                  {formatCurrency(transaction.amount)}
                </b>
              </div>
            ))}

            {visibleTransactions.length === 0 && (
              <div className="empty-table">No transactions found</div>
            )}
          </div>
        </section>

        <aside className="dashboard-stack">
          <section className="dashboard-panel quick-actions">
            <h2>Quick Actions</h2>

            <div className="quick-grid">
              <Link to="/add-customer" className="action-btn">
                <FaUserPlus />
                <span>Add Customer</span>
              </Link>

              <Link to="/supplier" className="action-btn">
                <FaTruck />
                <span>Supplier</span>
              </Link>

              <Link to="/payment" className="action-btn">
                <FaMoneyBillWave />
                <span>Add Payment</span>
              </Link>

              <Link to="/orders" className="action-btn">
                <FaClipboardList />
                <span>Orders</span>
              </Link>
            </div>
          </section>

          <section className="dashboard-panel amount-overview-card">
            <h2>Amount Overview</h2>

            <div className="amount-layout">
              <div
                className="amount-donut"
                style={{ "--paid": `${paidPercentage}%` }}
                onMouseMove={handleAmountHover}
                onMouseLeave={() => setActiveAmount(null)}
                onFocus={() => setActiveAmount("paid")}
                onBlur={() => setActiveAmount(null)}
                tabIndex="0"
                aria-label={amountTooltip}
              >
                <div className="donut-center">
                  <strong>{paidPercentage}%</strong>
                  <span>Paid</span>
                </div>
                <div className="amount-tooltip">{amountTooltip}</div>
              </div>

              <div className="amount-legend">
                <div>
                  <span className="legend-dot paid" />
                  <p>Paid Amount</p>
                  <b>{formatCurrency(paymentTotal)}</b>
                </div>
                <div>
                  <span className="legend-dot pending" />
                  <p>Pending Amount</p>
                  <b>{formatCurrency(pendingTotal || 70000)}</b>
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <div className="insight-grid">
        <section className="dashboard-panel activity-card">
          <h2>Today's Activity</h2>

          {activityData.map((item) => (
            <div className="activity-item" key={item.title}>
              <span>{item.title}</span>
              <b>{item.value}</b>
            </div>
          ))}
        </section>

        <section className="dashboard-panel top-products-card">
          <div className="section-header compact">
            <div>
              <h2>Top 10 Products</h2>
              <p>Products ranked by sale count.</p>
            </div>
          </div>

          <div className="product-bars">
            {topProducts.map((item) => {
              const productPercentage = Math.round((item.sales / maxProductSales) * 100);

              return (
                <div className="product-bar-row" key={item.name}>
                  <span title={item.name}>{item.name}</span>
                  <div className="product-bar-track" aria-label={`${item.name} ${productPercentage}%`}>
                    <div
                      className="product-bar-fill"
                      style={{ width: `${productPercentage}%` }}
                    />
                  </div>
                  <b>{productPercentage}%</b>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="bottom-section">
        <section className="dashboard-panel monthly-card">
          <div className="summary-chart-header">
            <div className="summary-metric">
              <span className="summary-icon"><FaMoneyBillWave /></span>
              <div>
                <p>Business Overview</p>
                <strong>{selectedSummaryTotal}</strong>
                <small>{selectedSummary.unit}</small>
              </div>
            </div>

            <div className="summary-range-tabs" aria-label="Monthly summary range">
              {Object.entries(summaryRanges).map(([key, range]) => (
                <button
                  className={summaryRange === key ? "active" : ""}
                  key={key}
                  type="button"
                  onClick={() => setSummaryRange(key)}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          <div className="summary-area-chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={selectedSummary.data} margin={{ top: 16, right: 12, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="summaryAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.32} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e8eef5" vertical={false} />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  tick={{ fill: "#94a3b8", fontSize: summaryRange === "month" ? 10 : 12, fontWeight: 700 }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 700 }}
                  domain={[0, "dataMax + 5"]}
                  tickFormatter={(value) => `₹${Math.round(value / 1000)}k`}
                  width={54}
                />
                <Tooltip
                  contentStyle={{
                    border: "0",
                    borderRadius: 12,
                    boxShadow: "0 14px 30px rgba(15, 23, 42, 0.14)",
                    fontWeight: 800,
                  }}
                  formatter={(value) => [formatCurrency(value), selectedSummary.title]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#10b981"
                  strokeWidth={4}
                  fill="url(#summaryAreaGradient)"
                  activeDot={{ r: 6, fill: "#10b981", stroke: "#ffffff", strokeWidth: 3 }}
                  dot={summaryRange === "month" ? false : { r: 4, fill: "#10b981", stroke: "#ffffff", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="dashboard-panel outstanding-card">
          <h2>Top Pending Customer</h2>
          <div className="dashboard-summary-card">

  {topPendingCustomers.map((customer, index) => (
    <div className="pending-customer-row" key={index}>
      <div className="pending-customer-left">
        <div className="customer-avatar">
          {customer.name.charAt(0)}
        </div>

        <div>
          <h4>{customer.name}</h4>
          <span>Pending Customer</span>
        </div>
      </div>

      <div className="pending-customer-amount">
        {customer.amount}
      </div>
    </div>
  ))}
</div>

          
        </section>

        <section className="dashboard-panel low-stock-card">
          <h2>Low Stock Alerts</h2>

          {lowStock.map((item) => (
            <div className="stock-item" key={item.product}>
              <span><FaBoxOpen /> {item.product}</span>
              <b>{item.stock} Left</b>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

export default Dashboard;
