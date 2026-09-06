import axios from "axios";

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

export const fetchProducts = async () => (await api.get("/products")).data;
export const fetchProduct = async (id) => (await api.get(`/products/${id}`)).data;
export const startCheckout = async (payload) => (await api.post("/checkout", payload)).data;
export const getPaymentStatus = async (sessionId) => (await api.get(`/payments/status/${sessionId}`)).data;

export const formatEUR = (cents) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);
