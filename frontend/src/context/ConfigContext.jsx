import { createContext, useContext, useState, useMemo } from "react";

const ConfigContext = createContext(null);

const initialProfile = {
  theme_id: "onyx",
  finish_id: "noir_mat",
  first_name: "",
  last_name: "",
  job_title: "",
  company: "",
  tagline: "",
  phone: "",
  email: "",
  avatar_url: "",
  logo_url: "",
  links: { linkedin: "", instagram: "", whatsapp: "", website: "", calendly: "", tiktok: "", youtube: "" },
};

const initialShipping = {
  full_name: "",
  line1: "",
  line2: "",
  city: "",
  postal_code: "",
  country: "FR",
};

export const ConfigProvider = ({ children }) => {
  const [productId, setProductId] = useState("card_prestige");
  const [quantity, setQuantity] = useState(1);
  const [profile, setProfile] = useState(initialProfile);
  const [shipping, setShipping] = useState(initialShipping);
  const [contactEmail, setContactEmail] = useState("");

  const value = useMemo(() => ({
    productId, setProductId,
    quantity, setQuantity,
    profile, setProfile,
    shipping, setShipping,
    contactEmail, setContactEmail,
    updateProfile: (patch) => setProfile((p) => ({ ...p, ...patch })),
    updateLinks: (patch) => setProfile((p) => ({ ...p, links: { ...p.links, ...patch } })),
    updateShipping: (patch) => setShipping((s) => ({ ...s, ...patch })),
    reset: () => { setProfile(initialProfile); setShipping(initialShipping); setContactEmail(""); },
  }), [productId, quantity, profile, shipping, contactEmail]);

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
};

export const useConfig = () => {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfig must be inside ConfigProvider");
  return ctx;
};
