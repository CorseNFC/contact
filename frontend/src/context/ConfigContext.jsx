import { createContext, useContext, useState, useMemo, useEffect } from "react";

const ConfigContext = createContext(null);

const STORAGE_KEY = "kt_configurator_state_v2";

const initialProfile = {
  theme_id: "onyx",
  finish_id: "noir_mat",
  layout_id: "hero", // hero | card | list | split | gradient | brutal
  first_name: "",
  last_name: "",
  job_title: "",
  company: "",
  tagline: "",
  bio: "",
  phone: "",
  email: "",
  avatar_url: "",
  hero_photo_url: "",
  logo_url: "",
  accent_color: "", // optional custom accent
  // Per-element color overrides. Any empty string → falls back to theme colors.
  text_colors: {
    first_name: "", last_name: "", job: "", company: "",
    tagline: "", bio: "", cta: "", links: "",
  },
  gallery_urls: [], // up to 6 photos (Hero layout)
  section_order: ["quick", "about", "gallery", "cta", "socials"], // order of Hero sections
  links: { linkedin: "", instagram: "", whatsapp: "", website: "", calendly: "", tiktok: "", youtube: "", facebook: "", twitter: "" },
};

const initialShipping = {
  full_name: "",
  line1: "",
  line2: "",
  city: "",
  postal_code: "",
  country: "FR",
};

// Load persisted state from localStorage (survives navigation & refresh)
const loadPersisted = () => {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
};

export const ConfigProvider = ({ children }) => {
  const persisted = typeof window !== "undefined" ? loadPersisted() : null;
  const [productId, setProductId] = useState(persisted?.productId || "card_prestige");
  const [quantity, setQuantity] = useState(persisted?.quantity || 1);
  const [profile, setProfile] = useState(() => ({
    ...initialProfile,
    ...(persisted?.profile || {}),
    text_colors: { ...initialProfile.text_colors, ...((persisted?.profile || {}).text_colors || {}) },
    links: { ...initialProfile.links, ...((persisted?.profile || {}).links || {}) },
  }));
  const [shipping, setShipping] = useState({ ...initialShipping, ...(persisted?.shipping || {}) });
  const [contactEmail, setContactEmail] = useState(persisted?.contactEmail || "");

  // Persist any change so nothing is lost when user navigates or refreshes
  useEffect(() => {
    try {
      const snapshot = { productId, quantity, profile, shipping, contactEmail };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {}
  }, [productId, quantity, profile, shipping, contactEmail]);

  const value = useMemo(() => ({
    productId, setProductId,
    quantity, setQuantity,
    profile, setProfile,
    shipping, setShipping,
    contactEmail, setContactEmail,
    updateProfile: (patch) => setProfile((p) => ({ ...p, ...patch })),
    updateLinks: (patch) => setProfile((p) => ({ ...p, links: { ...p.links, ...patch } })),
    updateTextColors: (patch) => setProfile((p) => ({ ...p, text_colors: { ...(p.text_colors || {}), ...patch } })),
    addGalleryUrl: (url) => setProfile((p) => ({ ...p, gallery_urls: [...(p.gallery_urls || []), url].slice(0, 6) })),
    removeGalleryAt: (idx) => setProfile((p) => ({ ...p, gallery_urls: (p.gallery_urls || []).filter((_, i) => i !== idx) })),
    moveSection: (id, dir) => setProfile((p) => {
      const arr = [...(p.section_order && p.section_order.length ? p.section_order : ["quick", "about", "gallery", "cta", "socials"])];
      const i = arr.indexOf(id);
      if (i < 0) return p;
      const j = i + dir;
      if (j < 0 || j >= arr.length) return p;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...p, section_order: arr };
    }),
    updateShipping: (patch) => setShipping((s) => ({ ...s, ...patch })),
    reset: () => {
      setProfile(initialProfile);
      setShipping(initialShipping);
      setContactEmail("");
      try { window.localStorage.removeItem(STORAGE_KEY); } catch {}
    },
  }), [productId, quantity, profile, shipping, contactEmail]);

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
};

export const useConfig = () => {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfig must be inside ConfigProvider");
  return ctx;
};
