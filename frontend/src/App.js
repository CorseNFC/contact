import "@/App.css";
import "@/index.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { ConfigProvider } from "@/context/ConfigContext";
import { AuthProvider } from "@/context/AuthContext";
import Landing from "@/pages/Landing";
import Configurator from "@/pages/Configurator";
import Success from "@/pages/Success";
import Cancel from "@/pages/Cancel";
import PublicProfile from "@/pages/PublicProfile";
import Login from "@/pages/Login";
import AuthCallback from "@/pages/AuthCallback";
import MyProfile from "@/pages/MyProfile";
import Reclaim from "@/pages/Reclaim";
import Admin from "@/pages/Admin";

function App() {
  return (
    <AuthProvider>
      <ConfigProvider>
        <BrowserRouter>
          <Toaster theme="dark" position="top-right" richColors />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/configurateur" element={<Configurator />} />
            <Route path="/paiement/succes" element={<Success />} />
            <Route path="/paiement/annule" element={<Cancel />} />
            <Route path="/p/:slug" element={<PublicProfile />} />
            <Route path="/connexion" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/mon-profil" element={<MyProfile />} />
            <Route path="/reclaim" element={<Reclaim />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </BrowserRouter>
      </ConfigProvider>
    </AuthProvider>
  );
}

export default App;
