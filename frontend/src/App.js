import "@/App.css";
import "@/index.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { ConfigProvider } from "@/context/ConfigContext";
import Landing from "@/pages/Landing";
import Configurator from "@/pages/Configurator";
import Success from "@/pages/Success";
import Cancel from "@/pages/Cancel";
import PublicProfile from "@/pages/PublicProfile";

function App() {
  return (
    <ConfigProvider>
      <BrowserRouter>
        <Toaster theme="dark" position="top-right" richColors />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/configurateur" element={<Configurator />} />
          <Route path="/paiement/succes" element={<Success />} />
          <Route path="/paiement/annule" element={<Cancel />} />
          <Route path="/p/:slug" element={<PublicProfile />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
