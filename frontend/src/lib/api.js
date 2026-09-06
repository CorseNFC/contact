import axios from "axios";

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TOKEN_KEY = "kt_session";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export const api = axios.create({ baseURL: API });
api.interceptors.request.use((cfg) => {
  const t = getToken();
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

export const fetchProducts = async () => (await api.get("/products")).data;
export const fetchProduct = async (id) => (await api.get(`/products/${id}`)).data;
export const startCheckout = async (payload) => (await api.post("/checkout", payload)).data;
export const getPaymentStatus = async (sessionId) => (await api.get(`/payments/status/${sessionId}`)).data;

export const requestMagicLink = async (email, origin_url) => (await api.post("/auth/request-link", { email, origin_url })).data;
export const verifyMagicLink = async (token) => (await api.get("/auth/verify", { params: { token } })).data;
export const getMe = async () => (await api.get("/me")).data;
export const updateProfile = async (slug, profile) => (await api.patch(`/me/profile/${slug}`, { profile })).data;
export const uploadAvatar = async (file) => {
  const fd = new FormData();
  fd.append("file", file);
  return (await api.post("/upload-avatar", fd, { headers: { "Content-Type": "multipart/form-data" } })).data;
};
export const getAnalytics = async (slug) => (await api.get(`/me/analytics/${slug}`)).data;
export const trackScan = async (slug) => (await api.post(`/profile/${slug}/scan`, {
  referrer: document.referrer || "",
  user_agent: navigator.userAgent.slice(0, 180),
})).data;
export const qrUrl = (slug) => `${API}/profile/${slug}/qr.png`;
export const publicProfileUrl = (slug) => `${window.location.origin}/p/${slug}`;

export const formatEUR = (cents) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(cents / 100);
