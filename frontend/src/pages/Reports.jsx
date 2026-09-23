import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaBalanceScale,
  FaCalendarAlt,
  FaChartLine,
  FaCreditCard,
  FaRupeeSign,
  FaSearch,
  FaUsers,
} from "react-icons/fa";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getCustomers } from "../services/customerService";
import "../Styles/Reports.css";

const profitData = [
  { month: "Jan", credit: 10000, debit: 4000, balance: 6000 },
  { month: "Feb", credit: 15000, debit: 8000, balance: 7000 },
  { month: "Mar", credit: 18000, debit: 9000, balance: 9000 },
  { month: "Apr", credit: 22000, debit: 11000, balance: 11000 },
  { month: "May", credit: 26000, debit: 13000, balance: 13000 },
  { month: "Jun", credit: 30000, debit: 15000, balance: 15000 },
  { month: "Jul", credit: 35000, debit: 18000, balance: 17000 },
  { month: "Aug", credit: 32000, debit: 16000, balance: 16000 },
  { month: "Sep", credit: 28000, debit: 14000, balance: 14000 },
  { month: "Oct", credit: 30000, debit: 15000, balance: 15000 },
  { month: "Nov", credit: 33000, debit: 17000, balance: 16000 },
  { month: "Dec", credit: 38000, debit: 19000, balance: 19000 },
];

const fallbackReportData = [
  {
    id: "demo-1",
    date: "2026-09-18",
    customer: "Amit Sharma",
    mobile: "9876543210",
    email: "amit.sharma@example.com",
    credit: 25000,
    debit: 8000,
    balance: 17000,
    status: "Active",
  },
  {
    id: "demo-2",
    date: "2026-09-17",
    customer: "Ramesh Gupta",
    mobile: "9988776655",
    email: "ramesh.gupta@example.com",
    credit: 18500,
    debit: 12500,
    balance: 6000,
    status: "Active",
  },
  {
    id: "demo-3",
    date: "2026-09-15",
    customer: "Suresh Patil",
    mobile: "9012345678",
    email: "suresh.patil@example.com",
    credit: 32000,
    debit: 11000,
    balance: 21000,
    status: "Active",
  },
  {
    id: "demo-4",
    date: "2026-09-12",
    customer: "Rahul Jadhav",
    mobile: "9123456780",
    email: "rahul.jadhav@example.com",
    credit: 14200,
    debit: 4200,
    balance: 10000,
    status: "Active",
  },
  {
    id: "demo-5",
    date: "2026-08-28",
    customer: "Akshay More",
    mobile: "9234567891",
    email: "akshay.more@example.com",
    credit: 9800,
    debit: 9800,
    balance: 0,
    status: "Closed",
  },
];

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

function Report() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [reportData, setReportData] = useState([]);

  useEffect(() => {
    let mounted = true;

    const loadCustomers = async () => {
      try {
        const res = await getCustomers();
        const rows = (res.data || []).map((customer) => ({
          id: customer.id,
          date: customer.created_at?.slice(0, 10) || "",
          customer: customer.customer_name || "Customer",
          mobile: customer.mobile || "-",
          email: customer.email || "-",
          credit: Number(customer.opening_balance || 0),
          debit:
            Number(customer.opening_balance || 0) -
            Number(customer.current_balance || 0),
          balance: Number(customer.current_balance || 0),
          status: customer.status || "Active",
        }));

        if (mounted) setReportData(rows.length ? rows : fallbackReportData);
      } catch (err) {
        console.log(err);
        if (mounted) setReportData(fallbackReportData);
      }
    };

    loadCustomers();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredData = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return reportData.filter((item) => {
      const searchMatch =
        !normalizedSearch || item.customer.toLowerCase().includes(normalizedSearch);
      const dateMatch = !selectedDate || item.date === selectedDate;
      const monthMatch = !selectedMonth || item.date?.slice(5, 7) === selectedMonth;
      const yearMatch = !selectedYear || item.date?.slice(0, 4) === selectedYear;

      return searchMatch && dateMatch && monthMatch && yearMatch;
    });
  }, [reportData, search, selectedDate, selectedMonth, selectedYear]);

  const totals = useMemo(
    () => ({
      customers: filteredData.length,
      credit: filteredData.reduce((sum, item) => sum + item.credit, 0),
      debit: filteredData.reduce((sum, item) => sum + item.debit, 0),
      balance: filteredData.reduce((sum, item) => sum + item.balance, 0),
    }),
    [filteredData]
  );

  return (
    <div className="report-page">
      <header className="report-hero">
        <div>
          <span className="report-eyebrow">Business insights</span>
          <h1>Reports Dashboard</h1>
          <p>Review customer balances, credit flow, debit recovery, and monthly trends in one responsive view.</p>
        </div>
        <div className="report-hero-badge">
          <FaChartLine />
          <span>{filteredData.length} records</span>
        </div>
      </header>

      <section className="filter-section">
        <label>
          <span><FaCalendarAlt /> Date</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
        </label>

        <label>
          <span>Month</span>
          <select
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
          >
            <option value="">All Months</option>
            <option value="01">Jan</option>
            <option value="02">Feb</option>
            <option value="03">Mar</option>
            <option value="04">Apr</option>
            <option value="05">May</option>
            <option value="06">Jun</option>
            <option value="07">Jul</option>
            <option value="08">Aug</option>
            <option value="09">Sep</option>
            <option value="10">Oct</option>
            <option value="11">Nov</option>
            <option value="12">Dec</option>
          </select>
        </label>

        <label>
          <span>Year</span>
          <select
            value={selectedYear}
            onChange={(event) => setSelectedYear(event.target.value)}
          >
            <option value="">All Years</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
          </select>
        </label>

        <label className="search-field">
          <span><FaSearch /> Search</span>
          <input
            type="text"
            placeholder="Search customer"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      </section>

      <section className="cards-grid">
        <div className="report-card customers">
          <span><FaUsers /></span>
          <p>Total Customers</p>
          <h2>{totals.customers}</h2>
        </div>
        <div className="report-card credit">
          <span><FaRupeeSign /></span>
          <p>Total Credit</p>
          <h2>{formatCurrency(totals.credit)}</h2>
        </div>
        <div className="report-card debit">
          <span><FaCreditCard /></span>
          <p>Total Debit</p>
          <h2>{formatCurrency(totals.debit)}</h2>
        </div>
        <div className="report-card balance">
          <span><FaBalanceScale /></span>
          <p>Current Balance</p>
          <h2>{formatCurrency(totals.balance)}</h2>
        </div>
      </section>

      <section className="graph-card">
        <div className="section-title-row">
          <div>
            <span>Trend analysis</span>
            <h2>Monthly Profit Analytics</h2>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={profitData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis dataKey="month" stroke="#ffffff" />
            <YAxis stroke="#ffffff" tickFormatter={(value) => `₹${value / 1000}k`} />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Legend />
            <Line type="monotone" dataKey="credit" stroke="#22c55e" strokeWidth={3} name="Credit" />
            <Line type="monotone" dataKey="debit" stroke="#2563eb" strokeWidth={3} name="Debit" />
            <Line type="monotone" dataKey="balance" stroke="#ef4444" strokeWidth={3} name="Balance" />
          </LineChart>
        </ResponsiveContainer>
      </section>

      <section className="table-container">
        <div className="section-title-row">
          <div>
            <span>Ledger records</span>
            <h2>Customer Report</h2>
          </div>
          <strong>{filteredData.length} rows</strong>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer</th>
              <th>Mobile</th>
              <th>Email</th>
              <th>Credit</th>
              <th>Debit</th>
              <th>Balance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item) => (
              <tr key={item.id}>
                <td>{item.date || "-"}</td>
                <td>
                  <button
                    className="customer-link"
                    onClick={() => {
                      if (!String(item.id).startsWith("demo-")) {
                        navigate(`/customers/${item.id}`);
                      }
                    }}
                    type="button"
                  >
                    {item.customer}
                  </button>
                </td>
                <td>{item.mobile}</td>
                <td>{item.email}</td>
                <td>{formatCurrency(item.credit)}</td>
                <td>{formatCurrency(item.debit)}</td>
                <td>{formatCurrency(item.balance)}</td>
                <td>
                  <span className={`status-badge ${String(item.status).toLowerCase()}`}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredData.length === 0 && (
          <div className="report-empty">No report records found</div>
        )}
      </section>
    </div>
  );
}

export default Report;
