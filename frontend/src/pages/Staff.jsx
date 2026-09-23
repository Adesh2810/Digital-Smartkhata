import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiBarChart2,
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiDollarSign,
  FiEdit2,
  FiEye,
  FiFileText,
  FiFilter,
  FiMail,
  FiMapPin,
  FiPhone,
  FiPlus,
  FiRefreshCw,
  FiSave,
  FiSearch,
  FiTrash2,
  FiUpload,
  FiUserCheck,
  FiUsers,
} from "react-icons/fi";
import "./Staff.css";
import {
  addStaff,
  addStaffAttendance,
  getStaff,
  getStaffHistory,
  getStaffSummary,
  updateStaff,
} from "../services/staffService";

const todayInput = () => new Date().toISOString().slice(0, 10);

const createEmptyStaff = () => ({
  staff_id: "",
  name: "",
  mobile: "",
  email: "",
  department: "",
  role: "",
  salary: "",
  joining_date: todayInput(),
  status: "Active",
  address: "",
  note: "",
});

const departments = ["Sales", "Accounts", "Marketing", "Store", "Delivery", "HR", "Admin"];
const statusOptions = ["All", "Active", "Inactive"];
const sortOptions = ["Name", "Salary", "Date"];

const hrmsModules = [
  { id: "dashboard", label: "Dashboard", target: "staff-dashboard" },
  { id: "registration", label: "Staff Registration", target: "staff-registration" },
  { id: "list", label: "Staff List", target: "staff-list-section" },
  { id: "profile", label: "Staff Details", target: "staff-profile-section" },
  { id: "attendance", label: "Attendance", target: "staff-attendance-section" },
  { id: "salary", label: "Salary", target: "staff-salary-section" },
  { id: "reports", label: "Reports", target: "staff-reports-section" },
];

const attendanceStats = [
  { label: "Present Days", value: 25, tone: "present" },
  { label: "Absent", value: 2, tone: "absent" },
  { label: "Half Day", value: 1, tone: "half" },
  { label: "Leave", value: 1, tone: "leave" },
  { label: "Late Entry", value: 3, tone: "late" },
];

const fallbackAttendanceHistory = [
  { date: "01 Jul", status: "Present", note: "On Time" },
  { date: "02 Jul", status: "Absent", note: "Sick" },
  { date: "03 Jul", status: "Half Day", note: "Personal" },
  { date: "04 Jul", status: "Leave", note: "Medical" },
];

const calendarDays = [
  "P", "P", "P", "A", "P", "P", "L",
  "P", "P", "P", "P", "HD", "P", "P",
  "P", "A", "P", "P", "P", "HD", "P",
  "L", "P", "P", "P", "P", "P", "P",
  "P", "P", "P",
];

const paymentHistory = [
  { date: "05 Jul", amount: 10000, mode: "Cash" },
  { date: "15 Jul", amount: 5000, mode: "UPI" },
];

const documents = ["Aadhar", "PAN", "Photo"];
const localStaffKey = "smartkhata-staff";
const localStaffDocumentsKey = "smartkhata-staff-documents";

const demoStaff = [
  {
    id: "demo-001",
    staff_id: "STF001",
    name: "Rahul Patil",
    mobile: "9876543210",
    email: "rahul.patil@example.com",
    department: "Sales",
    role: "Sales Executive",
    salary: 28000,
    joining_date: "2024-04-15",
    status: "Active",
    address: "Wakad, Pune",
    note: "Handles retail customer visits.",
  },
  {
    id: "demo-002",
    staff_id: "STF002",
    name: "Priya Sharma",
    mobile: "9765432109",
    email: "priya.sharma@example.com",
    department: "Accounts",
    role: "Accounts Assistant",
    salary: 32000,
    joining_date: "2023-11-08",
    status: "Active",
    address: "Hinjwadi, Pune",
    note: "Manages daily ledger entries and payments.",
  },
  {
    id: "demo-003",
    staff_id: "STF003",
    name: "Amit Jadhav",
    mobile: "9654321098",
    email: "amit.jadhav@example.com",
    department: "Store",
    role: "Store Manager",
    salary: 35000,
    joining_date: "2022-08-22",
    status: "Active",
    address: "Baner, Pune",
    note: "Maintains stock and supplier coordination.",
  },
  {
    id: "demo-004",
    staff_id: "STF004",
    name: "Neha Kulkarni",
    mobile: "9543210987",
    email: "neha.kulkarni@example.com",
    department: "Marketing",
    role: "Marketing Coordinator",
    salary: 30000,
    joining_date: "2024-01-10",
    status: "Active",
    address: "Aundh, Pune",
    note: "Coordinates local promotions and campaigns.",
  },
  {
    id: "demo-005",
    staff_id: "STF005",
    name: "Suresh Pawar",
    mobile: "9432109876",
    email: "suresh.pawar@example.com",
    department: "Delivery",
    role: "Delivery Associate",
    salary: 24000,
    joining_date: "2023-06-18",
    status: "Inactive",
    address: "Pimpri, Pune",
    note: "Currently on extended leave.",
  },
];

const demoSummary = {
  total_staff: demoStaff.length,
  active_staff: demoStaff.filter((item) => item.status === "Active").length,
  inactive_staff: demoStaff.filter((item) => item.status === "Inactive").length,
  monthly_salary: demoStaff.reduce((total, item) => total + Number(item.salary || 0), 0),
};

const readLocalStaff = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(localStaffKey) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

const writeLocalStaff = (rows) => {
  localStorage.setItem(localStaffKey, JSON.stringify(rows));
};

const readLocalStaffDocuments = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(localStaffDocumentsKey) || "{}");
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
};

const writeLocalStaffDocuments = (documentsByStaff) => {
  localStorage.setItem(localStaffDocumentsKey, JSON.stringify(documentsByStaff));
};

const dataUrlToBlob = (dataUrl) => {
  const [meta, base64Data] = String(dataUrl || "").split(",");
  const mimeMatch = meta.match(/data:(.*?);base64/);
  const mimeType = mimeMatch?.[1] || "application/octet-stream";
  const binary = window.atob(base64Data || "");
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
};

const createViewableFileUrl = (file) => {
  if (!file?.url) return "";
  if (String(file.url).startsWith("data:")) {
    return URL.createObjectURL(dataUrlToBlob(file.url));
  }

  return file.url;
};

const createSummary = (rows) => ({
  total_staff: rows.length,
  active_staff: rows.filter((item) => item.status === "Active").length,
  inactive_staff: rows.filter((item) => item.status === "Inactive").length,
  monthly_salary: rows
    .filter((item) => item.status !== "Inactive")
    .reduce((total, item) => total + Number(item.salary || 0), 0),
});

const normalizeStaffForm = (payload) => ({
  staff_id: payload.staff_id.trim(),
  name: payload.name.trim(),
  mobile: payload.mobile.trim(),
  email: payload.email.trim(),
  department: payload.department,
  role: payload.role.trim(),
  salary: Number(payload.salary || 0),
  joining_date: payload.joining_date,
  status: payload.status || "Active",
  address: payload.address.trim(),
  note: payload.note.trim(),
});

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
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const escapeCsvValue = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

const downloadTextFile = (filename, content, type = "text/csv;charset=utf-8;") => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const toCsv = (headers, rows) => [
  headers.map(escapeCsvValue).join(","),
  ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(",")),
].join("\n");

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function Staff() {
  const [staff, setStaff] = useState([]);
  const [summary, setSummary] = useState({
    total_staff: 0,
    active_staff: 0,
    inactive_staff: 0,
    monthly_salary: 0,
  });
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [form, setForm] = useState(createEmptyStaff);
  const [attendanceForm, setAttendanceForm] = useState({
    attendance_date: todayInput(),
    status: "Present",
    note: "",
  });
  const [staffHistory, setStaffHistory] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Name");
  const [activeModule, setActiveModule] = useState("dashboard");
  const [showForm, setShowForm] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [staffDocuments, setStaffDocuments] = useState(readLocalStaffDocuments);
  const documentInputRefs = useRef({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadStaff = async (preferredId) => {
    try {
      setLoading(true);
      setError("");
      const [summaryData, staffData] = await Promise.all([getStaffSummary(), getStaff()]);
      const savedStaff = Array.isArray(staffData) ? staffData : [];
      const localStaff = readLocalStaff();
      const list = savedStaff.length ? savedStaff : localStaff.length ? localStaff : demoStaff;

      setSummary(savedStaff.length ? summaryData || {} : createSummary(list));
      setStaff(list);
      setSelectedStaff((current) => {
        const targetId = preferredId || current?.id;
        return list.find((item) => String(item.id) === String(targetId)) || list[0] || null;
      });
    } catch (err) {
      console.log(err);
      const localStaff = readLocalStaff();
      const list = localStaff.length ? localStaff : demoStaff;

      setSummary(createSummary(list));
      setStaff(list);
      setSelectedStaff((current) => {
        const targetId = preferredId || current?.id;
        return list.find((item) => String(item.id) === String(targetId)) || list[0] || null;
      });
      setError("");
    } finally {
      setLoading(false);
    }
  };

  const loadStaffHistory = async (staffId) => {
    try {
      const history = await getStaffHistory(staffId);
      setStaffHistory(Array.isArray(history) ? history : []);
    } catch (err) {
      console.log(err);
      setStaffHistory([]);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStaff();
  }, []);

  useEffect(() => {
    if (selectedStaff?.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadStaffHistory(selectedStaff.id);
    }
  }, [selectedStaff?.id]);

  const filteredStaff = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = staff.filter((item) => {
      const matchesSearch =
        !query ||
        [item.staff_id, item.name, item.mobile, item.email, item.department, item.role, item.status, item.address]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      const matchesDepartment = departmentFilter === "All" || item.department === departmentFilter;
      const matchesStatus = statusFilter === "All" || item.status === statusFilter;
      return matchesSearch && matchesDepartment && matchesStatus;
    });

    return rows.sort((a, b) => {
      if (sortBy === "Salary") return Number(b.salary || 0) - Number(a.salary || 0);
      if (sortBy === "Date") return new Date(b.joining_date || 0) - new Date(a.joining_date || 0);
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }, [departmentFilter, staff, search, sortBy, statusFilter]);

  const selectedInitial = selectedStaff?.name?.charAt(0)?.toUpperCase() || "S";
  const selectedSalary = Number(selectedStaff?.salary || 0);
  const salaryPaid = selectedSalary ? Math.round(selectedSalary * 0.6) : 0;
  const pendingSalary = Math.max(selectedSalary - salaryPaid, 0);
  const attendanceRows = staffHistory
    .filter((item) => item.type === "Attendance")
    .map((item) => ({
      date: formatDate(item.record_date),
      status: item.status || "Present",
      note: item.note || "-",
    }));
  const shownAttendanceHistory = attendanceRows.length ? attendanceRows : fallbackAttendanceHistory;
  const dashboardCards = [
    { label: "Staff", value: summary.total_staff || staff.length || 0, icon: <FiUsers /> },
    { label: "Today's Present", value: Math.max(Number(summary.active_staff || 0) - 2, 0), icon: <FiUserCheck /> },
    { label: "Today's Absent", value: 2, icon: <FiClock /> },
    { label: "Monthly Salary", value: formatMoney(summary.monthly_salary), icon: <FiDollarSign /> },
    { label: "Pending Salary", value: formatMoney(Math.round(Number(summary.monthly_salary || 0) * 0.18)), icon: <FiFileText /> },
  ];

  const showSuccess = (text) => {
    setError("");
    setMessage(text);
    window.setTimeout(() => setMessage(""), 2600);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(createEmptyStaff());
  };

  const openAddForm = () => {
    resetForm();
    setActiveModule("registration");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openEditForm = (item) => {
    setEditingId(item.id);
    setForm({
      staff_id: item.staff_id || "",
      name: item.name || "",
      mobile: item.mobile || "",
      email: item.email || "",
      department: item.department || "",
      role: item.role || "",
      salary: item.salary || "",
      joining_date: item.joining_date ? String(item.joining_date).slice(0, 10) : todayInput(),
      status: item.status || "Active",
      address: item.address || "",
      note: item.note || "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeForm = () => {
    resetForm();
    setShowForm(false);
  };

  const validateForm = () => {
    const name = form.name.trim();

    if (!form.staff_id.trim()) return "Staff ID is required.";
    if (!name) return "Staff name is required.";
    if (!/^[A-Za-z ]+$/.test(name)) return "Staff name should contain only letters.";
    if (!/^[6-9]\d{9}$/.test(form.mobile.trim())) return "Enter valid 10 digit mobile number.";
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) return "Enter valid email address.";
    if (!form.department) return "Please select department.";
    if (!form.role.trim()) return "Designation is required.";
    if (!form.salary || Number(form.salary) <= 0) return "Salary must be greater than 0.";
    if (!form.joining_date) return "Joining date is required.";

    return "";
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleAttendanceChange = (event) => {
    const { name, value } = event.target;
    setAttendanceForm((current) => ({ ...current, [name]: value }));
  };

  const submitStaff = async (event) => {
    event.preventDefault();
    setError("");

    const validationMessage = validateForm();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    try {
      setSaving(true);
      const staffPayload = normalizeStaffForm(form);

      if (editingId) {
        await updateStaff(editingId, staffPayload);
        showSuccess("Staff updated successfully.");
        setSearch("");
        await loadStaff(editingId); 
      } else {
        const result = await addStaff(staffPayload);
        showSuccess("Staff added successfully.");
        setSearch("");
        await loadStaff(result.id);
      }

      closeForm();
    } catch (err) {
      console.log(err);
      const staffPayload = normalizeStaffForm(form);
      const localRows = readLocalStaff();
      const baseRows = localRows.length ? localRows : staff.filter((item) => !String(item.id).startsWith("demo-"));
      let savedRows;
      let savedId = editingId;

      if (editingId) {
        savedRows = baseRows.map((item) =>
          String(item.id) === String(editingId) ? { ...item, ...staffPayload, id: item.id } : item
        );
        if (!savedRows.some((item) => String(item.id) === String(editingId))) {
          savedRows = [{ ...staffPayload, id: editingId }, ...baseRows];
        }
        showSuccess("Staff updated locally.");
      } else {
        savedId = `local-${Date.now()}`;
        savedRows = [{ ...staffPayload, id: savedId }, ...baseRows];
        showSuccess("Staff added locally.");
      }

      writeLocalStaff(savedRows);
      setStaff(savedRows);
      setSummary(createSummary(savedRows));
      setSelectedStaff(savedRows.find((item) => String(item.id) === String(savedId)) || savedRows[0] || null);
      setSearch("");
      closeForm();
    } finally {
      setSaving(false);
    }
  };

  const submitAttendance = async (event) => {
    event.preventDefault();
    if (!selectedStaff) return;

    try {
      setSavingAttendance(true);
      setError("");
      await addStaffAttendance(selectedStaff.id, attendanceForm);
      showSuccess("Attendance saved successfully.");
      setAttendanceForm({ attendance_date: todayInput(), status: "Present", note: "" });
      await loadStaffHistory(selectedStaff.id);
    } catch (err) {
      console.log(err);
      setError(err.response?.data?.message || "Attendance save failed.");
    } finally {
      setSavingAttendance(false);
    }
  };

  const getDocumentKey = (document) => `${selectedStaff?.id || "staff"}-${document}`;

  const uploadDocument = (document, event) => {
    const file = event.target.files?.[0];
    if (!file || !selectedStaff) return;

    const documentKey = getDocumentKey(document);
    const reader = new FileReader();

    reader.onload = () => {
      setStaffDocuments((current) => ({
        ...current,
        [documentKey]: {
          name: file.name,
          url: reader.result,
          type: file.type,
          saved: false,
        },
      }));
      showSuccess(`${document} uploaded. Save it to keep after refresh.`);
    };

    reader.onerror = () => {
      setError(`${document} upload failed. Please try again.`);
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const saveDocument = (documentName) => {
    const documentKey = getDocumentKey(documentName);
    const file = staffDocuments[documentKey];

    if (!file) {
      setError(`Upload the ${documentName} document first.`);
      return;
    }

    const savedFile = { ...file, saved: true };
    const updatedDocuments = {
      ...staffDocuments,
      [documentKey]: savedFile,
    };
    const savedDocuments = {
      ...readLocalStaffDocuments(),
      [documentKey]: savedFile,
    };

    setStaffDocuments(updatedDocuments);
    writeLocalStaffDocuments(savedDocuments);
    showSuccess(`${documentName} saved successfully.`);
  };

  const viewDocument = (documentName) => {
    const file = staffDocuments[getDocumentKey(documentName)];
    if (!file) {
      setError(`Upload the ${documentName} document first.`);
      return;
    }

    const viewUrl = createViewableFileUrl(file);
    const openedWindow = window.open(viewUrl, "_blank", "noopener,noreferrer");

    if (!openedWindow) {
      setError("Popup blocked hai. Browser me popups allow karke phir View try kare.");
      if (viewUrl.startsWith("blob:")) URL.revokeObjectURL(viewUrl);
      return;
    }

    if (viewUrl.startsWith("blob:")) {
      window.setTimeout(() => URL.revokeObjectURL(viewUrl), 60000);
    }
  };

  const downloadDocument = (documentName) => {
    const file = staffDocuments[getDocumentKey(documentName)];
    if (!file) {
      setError(`Upload the ${documentName} document first.`);
      return;
    }

    const downloadUrl = createViewableFileUrl(file);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();

    if (downloadUrl.startsWith("blob:")) {
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    }
  };

  const removeDocument = (documentName) => {
    const documentKey = getDocumentKey(documentName);
    const file = staffDocuments[documentKey];
    if (!file) return;

    setStaffDocuments((current) => {
      const updatedDocuments = { ...current };
      delete updatedDocuments[documentKey];
      const savedDocuments = readLocalStaffDocuments();
      delete savedDocuments[documentKey];
      writeLocalStaffDocuments(savedDocuments);
      return updatedDocuments;
    });
    showSuccess(`${documentName} removed. You can upload a new file.`);
  };

  const buildStaffRows = () =>
    filteredStaff.map((item) => ({
      "Staff ID": item.staff_id || "-",
      Name: item.name || "-",
      Mobile: item.mobile || "-",
      Email: item.email || "-",
      Department: item.department || "-",
      Role: item.role || "-",
      Salary: Number(item.salary || 0),
      "Joining Date": formatDate(item.joining_date),
      Status: item.status || "Active",
      Address: item.address || "-",
    }));

  const buildAttendanceRows = () =>
    shownAttendanceHistory.map((item) => ({
      "Staff ID": selectedStaff?.staff_id || "-",
      Name: selectedStaff?.name || "-",
      Date: item.date,
      Status: item.status,
      Note: item.note || "-",
    }));

  const buildSalaryRows = () => [
    {
      "Staff ID": selectedStaff?.staff_id || "-",
      Name: selectedStaff?.name || "-",
      "Monthly Salary": selectedSalary,
      Paid: salaryPaid,
      Pending: pendingSalary,
      Department: selectedStaff?.department || "-",
      Role: selectedStaff?.role || "-",
    },
    ...paymentHistory.map((item) => ({
      "Staff ID": selectedStaff?.staff_id || "-",
      Name: selectedStaff?.name || "-",
      "Monthly Salary": "",
      Paid: item.amount,
      Pending: "",
      Department: "Payment",
      Role: `${item.date} - ${item.mode}`,
    })),
  ];

  const downloadReport = (reportName, rows, filename) => {
    if (!rows.length) {
      setError("Report ke liye data available nahi hai.");
      return;
    }

    const headers = Object.keys(rows[0]);
    downloadTextFile(filename, toCsv(headers, rows));
    showSuccess(`${reportName} downloaded successfully.`);
  };

  const exportExcel = () => {
    const rows = buildStaffRows();
    if (!rows.length) {
      setError("Excel export ke liye staff data available nahi hai.");
      return;
    }

    const headers = Object.keys(rows[0]);
    const tableRows = rows
      .map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml(row[header])}</td>`).join("")}</tr>`)
      .join("");
    const table = `<table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${tableRows}</tbody></table>`;

    downloadTextFile("staff-report.xls", table, "application/vnd.ms-excel;charset=utf-8;");
    showSuccess("Excel report downloaded successfully.");
  };

  const exportPdf = () => {
    const rows = buildStaffRows();
    if (!rows.length) {
      setError("PDF export ke liye staff data available nahi hai.");
      return;
    }

    const headers = Object.keys(rows[0]);
    const reportWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!reportWindow) {
      setError("Popup blocked hai. Browser me popups allow karke phir try kare.");
      return;
    }

    const tableRows = rows
      .map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml(row[header])}</td>`).join("")}</tr>`)
      .join("");

    reportWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Staff Report</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; padding: 24px; }
            h1 { margin: 0 0 6px; font-size: 24px; }
            p { margin: 0 0 18px; color: #475569; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
            th { background: #e0f2fe; color: #075985; }
          </style>
        </head>
        <body>
          <h1>Staff Report</h1>
          <p>Generated on ${escapeHtml(formatDate(new Date()))}</p>
          <table>
            <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    reportWindow.document.close();
    showSuccess("PDF report ready. Print dialog open ho jayega.");
  };

  const reportActions = [
    {
      label: "Attendance Report",
      onClick: () => downloadReport("Attendance report", buildAttendanceRows(), "attendance-report.csv"),
    },
    {
      label: "Salary Report",
      onClick: () => downloadReport("Salary report", buildSalaryRows(), "salary-report.csv"),
    },
    {
      label: "Staff Report",
      onClick: () => downloadReport("Staff report", buildStaffRows(), "staff-report.csv"),
    },
    { label: "Export Excel", onClick: exportExcel },
    { label: "Export PDF", onClick: exportPdf },
  ];

  const openModule = (module) => {
    setActiveModule(module.id);

    if (module.id === "registration") {
      setShowForm(true);
      window.setTimeout(() => {
        document.getElementById(module.target)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
      return;
    }

    document.getElementById(module.target)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="staff-page">
      <header className="staff-header">
        <div>
          <span className="staff-kicker">
            <FiUserCheck /> Staff Desk
          </span>
          <h1>Staff Management</h1>
          <p>Staff records, attendance, salary, documents, and reports.</p>
        </div>
        <button className="staff-primary-btn" type="button" onClick={openAddForm}>
          <FiPlus /> Add Staff
        </button>
      </header>

      {(message || error) && <div className={error ? "staff-alert error" : "staff-alert success"}>{error || message}</div>}

      <nav className="staff-module-nav" aria-label="HRMS modules">
        {hrmsModules.map((module) => (
          <button
            className={activeModule === module.id ? "active" : ""}
            key={module.id}
            type="button"
            onClick={() => openModule(module)}
          >
            {module.label}
          </button>
        ))}
      </nav>

      <section className="staff-summary-grid" id="staff-dashboard" aria-label="Staff summary">
        {dashboardCards.map((card) => (
          <div className="staff-summary-card" key={card.label}>
            {card.icon}
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </div>
        ))}
      </section>

      <section className="staff-filter-bar" aria-label="Staff filters">
        <label>
          <FiSearch />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search staff..." />
        </label>
        <label>
          <FiFilter />
          <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
            <option>All</option>
            {departments.map((department) => (
              <option key={department}>{department}</option>
            ))}
          </select>
        </label>
        <label>
          <FiCheckCircle />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            {statusOptions.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
        <label>
          <FiBarChart2 />
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            {sortOptions.map((sort) => (
              <option key={sort}>{sort}</option>
            ))}
          </select>
        </label>
      </section>

      {showForm && (
        <section className="staff-form-card" id="staff-registration">
          <div className="staff-section-title">
            <div>
              <h2>{editingId ? "Edit Staff" : "Add Staff"}</h2>
              <p>{editingId ? "Update staff profile details." : "Create a new staff profile."}</p>
            </div>
            <button type="button" onClick={closeForm}>
              Cancel
            </button>
          </div>

          <form onSubmit={submitStaff} noValidate>
            <div className="staff-form-grid">
              <label>
                Staff ID
                <input name="staff_id" value={form.staff_id} onChange={handleFormChange} placeholder="STF001" />
              </label>
              <label>
                Staff Name
                <input name="name" value={form.name} onChange={handleFormChange} placeholder="Full name" />
              </label>
              <label>
                Mobile Number
                <input name="mobile" value={form.mobile} onChange={handleFormChange} placeholder="9876543210" />
              </label>
              <label>
                Email Address
                <input type="email" name="email" value={form.email} onChange={handleFormChange} placeholder="name@example.com" />
              </label>
              <label>
                Department
                <select name="department" value={form.department} onChange={handleFormChange}>
                  <option value="">Select department</option>
                  {departments.map((department) => (
                    <option key={department}>{department}</option>
                  ))}
                </select>
              </label>
              <label>
                Designation
                <input name="role" value={form.role} onChange={handleFormChange} placeholder="Sales Executive" />
              </label>
              <label>
                Monthly Salary
                <input type="number" min="1" name="salary" value={form.salary} onChange={handleFormChange} placeholder="25000" />
              </label>
              <label>
                Joining Date
                <input type="date" name="joining_date" value={form.joining_date} onChange={handleFormChange} />
              </label>
              <label>
                Status
                <select name="status" value={form.status} onChange={handleFormChange}>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </label>
              <label className="staff-field-wide">
                Address
                <textarea rows="2" name="address" value={form.address} onChange={handleFormChange} placeholder="Pune Maharashtra" />
              </label>
              <label className="staff-field-wide">
                Notes
                <textarea rows="2" name="note" value={form.note} onChange={handleFormChange} placeholder="Good Staff" />
              </label>
            </div>

            <div className="staff-form-actions">
              <button className="staff-save-btn" type="submit" disabled={saving}>
                {saving ? "Saving..." : editingId ? "Update Staff" : "Save Staff"}
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="staff-workspace">
        <aside className="staff-list-panel" id="staff-list-section">
          <div className="staff-search-box">
            <FiSearch />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search staff..." />
          </div>
          <div className="staff-list-title">
            <div>
              <h2>Staff List</h2>
              <span>{filteredStaff.length} shown</span>
            </div>
            <button type="button" onClick={() => loadStaff(selectedStaff?.id)} aria-label="Refresh staff">
              <FiRefreshCw />
            </button>
          </div>
          <div className="staff-list">
            {loading ? (
              <div className="staff-empty">Loading staff...</div>
            ) : filteredStaff.length ? (
              filteredStaff.map((item) => (
                <button
                  className={selectedStaff?.id === item.id ? "staff-list-item active" : "staff-list-item"}
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedStaff(item);
                    setShowDocuments(false);
                  }}
                >
                  <span className="staff-avatar">{item.name?.charAt(0)?.toUpperCase() || "S"}</span>
                  <span>
                    <strong>{item.name || "Unnamed Staff"}</strong>
                    <small>{item.staff_id || item.department || item.role || "Staff"} - {item.mobile || "No mobile"}</small>
                  </span>
                  <b className={item.status === "Active" ? "active" : "inactive"}>{item.status}</b>
                </button>
              ))
            ) : (
              <div className="staff-empty">No staff found.</div>
            )}
          </div>
        </aside>

        <main className="staff-detail-panel" id="staff-profile-section">
          {selectedStaff ? (
            <>
              <section className="staff-profile-card professional-profile">
                <div className="staff-profile-title">
                  <span className="staff-avatar large">{selectedInitial}</span>
                  <div className="staff-profile-heading">
                    <div className="staff-profile-name-row">
                      <h2>{selectedStaff.name}</h2>
                      <span className={selectedStaff.status === "Active" ? "status-active" : "status-inactive"}>
                        {selectedStaff.status || "Active"}
                      </span>
                      <button
                        className="staff-doc-toggle"
                        type="button"
                        aria-expanded={showDocuments}
                        onClick={() => setShowDocuments((current) => !current)}
                      >
                        <FiFileText /> Documents
                      </button>
                      <button className="staff-inline-edit" type="button" onClick={() => openEditForm(selectedStaff)}>
                        <FiEdit2 /> Edit Staff
                      </button>
                    </div>
                    <small>{selectedStaff.staff_id || "-"} | {selectedStaff.role || "Staff"}</small>
                  </div>
                </div>
                <div className="staff-profile-line-list">
                  <div><FiPhone /><span>Mobile</span><strong>{selectedStaff.mobile || "-"}</strong></div>
                  <div><FiMail /><span>Email</span><strong>{selectedStaff.email || "-"}</strong></div>
                  <div><FiBriefcase /><span>Department</span><strong>{selectedStaff.department || "-"}</strong></div>
                  <div><FiDollarSign /><span>Salary</span><strong>{formatMoney(selectedStaff.salary)}</strong></div>
                  <div><FiCalendar /><span>Joining</span><strong>{formatDate(selectedStaff.joining_date)}</strong></div>
                  <div><FiMapPin /><span>Address</span><strong>{selectedStaff.address || "Not available"}</strong></div>
                  <div><FiFileText /><span>Notes</span><strong>{selectedStaff.note || "No notes added."}</strong></div>
                </div>
                {showDocuments && (
                  <div className="staff-profile-documents">
                    <div className="staff-doc-grid">
                      {documents.map((documentName) => {
                        const uploadedFile = staffDocuments[getDocumentKey(documentName)];

                        return (
                        <div key={documentName}>
                          <div className="staff-document-info">
                            <strong>{documentName}</strong>
                            <small>{uploadedFile?.name || "No file uploaded"}</small>
                          </div>
                          <span>
                            <input
                              ref={(node) => { documentInputRefs.current[documentName] = node; }}
                              className="staff-document-input"
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={(event) => uploadDocument(documentName, event)}
                            />
                            <button type="button" onClick={() => documentInputRefs.current[documentName]?.click()}>
                              <FiUpload /> Upload
                            </button>
                            <button type="button" onClick={() => viewDocument(documentName)}>
                              <FiEye /> View
                            </button>
                            <button type="button" onClick={() => downloadDocument(documentName)}>
                              <FiDownload /> Download
                            </button>
                            <button type="button" onClick={() => saveDocument(documentName)} disabled={!uploadedFile}>
                              <FiSave /> Save
                            </button>
                            {uploadedFile && (
                              <button className="staff-document-remove" type="button" onClick={() => removeDocument(documentName)}>
                                <FiTrash2 /> Remove
                              </button>
                            )}
                          </span>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>

              <section className="staff-dashboard-block" id="staff-attendance-section">
                <div className="staff-block-title">
                  <h3>Attendance Dashboard</h3>
                  <span>July 2026</span>
                </div>
                <div className="staff-attendance-dashboard">
                  {attendanceStats.map((item) => (
                    <div key={item.label}>
                      <span>{item.label}</span>
                      <strong className={item.tone}>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </section>

              <section className="staff-dashboard-block">
                <div className="staff-block-title">
                  <h3>Attendance Entry Form</h3>
                  <span>Save daily status</span>
                </div>
                <form className="staff-attendance-form" onSubmit={submitAttendance}>
                  <label>
                    Date
                    <input type="date" name="attendance_date" value={attendanceForm.attendance_date} onChange={handleAttendanceChange} />
                  </label>
                  <label>
                    Status
                    <select name="status" value={attendanceForm.status} onChange={handleAttendanceChange}>
                      <option>Present</option>
                      <option>Absent</option>
                      <option>Half Day</option>
                      <option>Leave</option>
                    </select>
                  </label>
                  <label className="attendance-remarks">
                    Remarks
                    <input name="note" value={attendanceForm.note} onChange={handleAttendanceChange} placeholder="On Time" />
                  </label>
                  <button type="submit" disabled={savingAttendance}>
                    {savingAttendance ? "Saving..." : "Save Attendance"}
                  </button>
                </form>
              </section>

              <section className="staff-dashboard-block">
                <div className="staff-block-title">
                  <h3>Attendance Calendar</h3>
                  <span>July 2026</span>
                </div>
                <div className="staff-calendar">
                  {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((day) => (
                    <b key={day}>{day}</b>
                  ))}
                  {calendarDays.map((day, index) => (
                    <span className={`day-${day.toLowerCase()}`} key={`${day}-${index}`}>
                      {day}
                    </span>
                  ))}
                </div>
                <div className="staff-calendar-legend">
                  <span><i className="present" /> Present</span>
                  <span><i className="absent" /> Absent</span>
                  <span><i className="half" /> Half Day</span>
                  <span><i className="leave" /> Leave</span>
                </div>
              </section>

              <section className="staff-dashboard-block">
                <div className="staff-block-title">
                  <h3>Attendance History</h3>
                  <span>{shownAttendanceHistory.length} records</span>
                </div>
                <div className="staff-table-wrap">
                  <table className="staff-table compact-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shownAttendanceHistory.map((item) => (
                        <tr key={`${item.date}-${item.status}-${item.note}`}>
                          <td data-label="Date">{item.date}</td>
                          <td data-label="Status"><span className={`status-pill ${String(item.status).toLowerCase().replace(" ", "-")}`}>{item.status}</span></td>
                          <td data-label="Remarks">{item.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="staff-dashboard-block" id="staff-salary-section">
                <div className="staff-block-title">
                  <h3>Salary Dashboard</h3>
                  <span>Last Payment: 20-Jun-2026</span>
                </div>
                <div className="staff-money-grid salary-dashboard-grid">
                  <div><span>Monthly Salary</span><strong>{formatMoney(selectedSalary)}</strong></div>
                  <div><span>Salary Paid</span><strong className="present">{formatMoney(salaryPaid)}</strong></div>
                  <div><span>Pending Salary</span><strong className="absent">{formatMoney(pendingSalary)}</strong></div>
                </div>
              </section>

              <section className="staff-dashboard-block">
                <div className="staff-block-title">
                  <h3>Salary Payment History</h3>
                  <span>{paymentHistory.length} payments</span>
                </div>
                <div className="staff-table-wrap">
                  <table className="staff-table compact-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Mode</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentHistory.map((item) => (
                        <tr key={`${item.date}-${item.amount}`}>
                          <td data-label="Date">{item.date}</td>
                          <td data-label="Amount">{formatMoney(item.amount)}</td>
                          <td data-label="Mode">{item.mode}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="staff-dashboard-block" id="staff-reports-section">
                <div className="staff-block-title">
                  <h3>Reports</h3>
                  <span>Export</span>
                </div>
                <div className="staff-report-actions">
                  {reportActions.map((report) => (
                    <button type="button" key={report.label} onClick={report.onClick}>
                      {report.label}
                    </button>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <div className="staff-empty detail-empty">Select staff to view details.</div>
          )}
        </main>
      </div>
    </div>
  );
}

export default Staff;
