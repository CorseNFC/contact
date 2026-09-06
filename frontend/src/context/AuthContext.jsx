import { createContext, useContext, useEffect, useState, useMemo } from "react";
import { getToken, setToken, clearToken, getMe } from "@/lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!getToken()) { setUser(null); setLoading(false); return; }
    try { const me = await getMe(); setUser(me); }
    catch { clearToken(); setUser(null); }
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  const value = useMemo(() => ({
    user, loading,
    login: async (token) => { setToken(token); await refresh(); },
    logout: () => { clearToken(); setUser(null); },
    refresh,
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const c = useContext(AuthContext);
  if (!c) throw new Error("useAuth must be inside AuthProvider");
  return c;
};
