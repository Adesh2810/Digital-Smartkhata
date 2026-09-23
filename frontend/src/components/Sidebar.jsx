import { useState } from "react";
import { FiBarChart2, FiCreditCard, FiFileText, FiHome, FiLogOut, FiMenu, FiPackage, FiSettings, FiShoppingCart, FiUserCheck, FiUsers, FiX } from "react-icons/fi";
import { NavLink, useNavigate } from "react-router-dom";
import "./Sidebar.css";

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: FiHome },
  { label: "Customers", path: "/customers", icon: FiUsers },
  { label: "Supplier", path: "/supplier", icon: FiCreditCard },
  { label: "Payment", path: "/payment", icon: FiCreditCard },
  { label: "Shopping", path: "/shopping", icon: FiShoppingCart },
  { label: "Inventory", path: "/inventory", icon: FiPackage },
  { label: "Staff", path: "/staff", icon: FiUserCheck },
  { label: "Orders", path: "/orders", icon: FiFileText },
  { label: "Reports", path: "/reports", icon: FiBarChart2 },
  { label: "Settings", path: "/settings", icon: FiSettings },
];

function Sidebar({ children }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const closeSidebar = () => setIsOpen(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    closeSidebar();
    navigate("/login");
  };

  return (
    <div className="app-layout">
      <aside className={isOpen ? "app-sidebar open" : "app-sidebar"}>
        <div className="sidebar-brand">
          <span className="brand-mark">SK</span>
          <div>
            <h2>KhataBook</h2>
            <p>Business Desk</p>
          </div>
          <button className="sidebar-close-btn" type="button" onClick={closeSidebar} aria-label="Close sidebar">
            <FiX />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
                onClick={closeSidebar}
              >
                <Icon />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <span>{user?.name?.charAt(0)?.toUpperCase() || "U"}</span>
            <div>
              <strong>{user?.name || "User"}</strong>
              <p>{user?.email || "Logged in"}</p>
            </div>
          </div>

          <button className="logout-btn" type="button" onClick={handleLogout}>
            <FiLogOut />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {isOpen && <button className="sidebar-overlay" type="button" aria-label="Close sidebar" onClick={closeSidebar} />}

      <main className="layout-main">
        <header className="layout-topbar">
          <button className="mobile-menu-btn" type="button" onClick={() => setIsOpen(true)} aria-label="Open sidebar">
            <FiMenu />
          </button>

          <div>
            <h1>Smart Khata</h1>
            <p>Manage daily business records</p>
          </div>

          <div className="topbar-profile">
            <span>{user?.name?.charAt(0)?.toUpperCase() || "U"}</span>
            <div>
              <strong>{user?.name || "User"}</strong>
              <p>{user?.email || "Welcome"}</p>
            </div>
          </div>

          <button className="mobile-close-btn" type="button" onClick={closeSidebar} aria-label="Close sidebar">
            <FiX />
          </button>
        </header>

        <div className="layout-content">{children}</div>
      </main>
    </div>
  );
}

export default Sidebar;
