import api from "./api";

export const getSupplierPurchaseSummary = async () => {
  const response = await api.get("/supplier-purchases/summary");
  return response.data;
};

export const getSupplierPurchases = async () => {
  const response = await api.get("/supplier-purchases");
  return response.data;
};

export const addSupplierPurchase = async (purchaseData) => {
  const response = await api.post("/supplier-purchases", purchaseData);
  return response.data;
};

export const updateSupplierPurchase = async (id, purchaseData) => {
  const response = await api.put(`/supplier-purchases/${id}`, purchaseData);
  return response.data;
};

export const deleteSupplierPurchase = async (id) => {
  const response = await api.delete(`/supplier-purchases/${id}`);
  return response.data;
};

export default {
  getSupplierPurchaseSummary,
  getSupplierPurchases,
  addSupplierPurchase,
  updateSupplierPurchase,
  deleteSupplierPurchase,
};
