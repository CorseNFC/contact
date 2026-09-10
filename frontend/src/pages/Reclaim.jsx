import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { reclaimCard } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function Reclaim() {
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const auth = useAuth();

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const r = await reclaimCard(code.trim().toUpperCase(), email.trim().toLowerCase());
      await auth.login(r.session_token);
      toast.success("Carte transférée !");
      nav("/mon-profil", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Code invalide ou expiré");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#1F1B16]">
      <Navbar />
      <div className="pt-32 pb-24 max-w-md mx-auto px-4" data-testid="reclaim-page">
        <div className="w-14 h-14 rounded-full bg-amber-500/10 grid place-items-center border border-amber-500/30 mb-5">
          <KeyRound className="text-amber-400" size={24} />
        </div>
        <p className="eyebrow">Reprendre une carte KalliTag</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Récupérer avec un code</h1>
        <p className="mt-3 text-sm text-[#6B5F4E]">L'ancien propriétaire a généré un code de transfert. Entrez-le avec votre email pour prendre possession de la carte.</p>

        <form onSubmit={submit} className="kt-card mt-8 p-6 space-y-4">
          <div>
            <Label className="text-xs text-[#6B5F4E] mb-1.5 block">Code de transfert</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="XXXXXXXX" maxLength={8}
                   data-testid="reclaim-code" required
                   className="bg-white/70 border-[#1F1B16]/10 focus:border-amber-400/60 text-[#1F1B16] font-mono tracking-[0.3em] uppercase" />
          </div>
          <div>
            <Label className="text-xs text-[#6B5F4E] mb-1.5 block">Votre email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="reclaim-email"
                   className="bg-white/70 border-[#1F1B16]/10 focus:border-amber-400/60 text-[#1F1B16]" />
          </div>
          <button type="submit" disabled={loading || !code || !email} className="kt-btn-gold w-full justify-center" data-testid="reclaim-submit">
            {loading ? <><Loader2 className="animate-spin" size={16} /> Reprise...</> : "Reprendre la carte"}
          </button>
        </form>
      </div>
      <Footer />
    </div>
  );
}
