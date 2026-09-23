import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import Supplier from "./pages/Supplier";
import Payment from "./pages/Payment";
import Shopping from "./pages/Shopping";
import Inventory from "./pages/Inventory";
import Staff from "./pages/Staff";
import Orders from "./pages/Orders";
import Report from "./pages/Reports";
import Settings from "./pages/Settings";
import AddCustomer from "./pages/AddCustomer";
import Sidebar from "./components/Sidebar";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Sidebar>{children}</Sidebar>;
};

const withSidebar = (page) => <ProtectedRoute>{page}</ProtectedRoute>;

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={withSidebar(<Dashboard />)} />
        <Route path="/customers" element={withSidebar(<Customers />)} />
        <Route path="/supplier" element={withSidebar(<Supplier />)} />
        <Route path="/payment" element={withSidebar(<Payment />)} />
        <Route path="/shopping" element={withSidebar(<Shopping />)} />
        <Route path="/inventory" element={withSidebar(<Inventory />)} />
        <Route path="/staff" element={withSidebar(<Staff />)} />
        <Route path="/orders" element={withSidebar(<Orders />)} />
        <Route path="/reports" element={withSidebar(<Report />)} />
        <Route path="/settings" element={withSidebar(<Settings />)} />
        <Route path="/add-customer" element={withSidebar(<AddCustomer />)} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
