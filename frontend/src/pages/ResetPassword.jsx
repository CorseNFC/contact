import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, ArrowRight, Eye, EyeOff, KeyRound } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authResetPassword } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function ResetPassword() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { login } = useAuth();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (password.length < 8) { toast.error("8 caractères minimum"); return; }
    if (password !== confirm) { toast.error("Les mots de passe ne correspondent pas"); return; }
    if (!token) { toast.error("Lien invalide — redemandez un email"); return; }
    setLoading(true);
    try {
      const r = await authResetPassword(token, password);
      if (r.session_token) await login(r.session_token);
      toast.success("Mot de passe réinitialisé !");
      nav("/mon-compte", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Lien expiré, redemandez un email depuis /connexion");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#1F1B16]">
      <Navbar />
      <div className="pt-32 pb-24 max-w-md mx-auto px-4" data-testid="reset-password-page">
        <div className="w-14 h-14 rounded-full bg-amber-500/10 grid place-items-center border border-amber-500/30 mb-4">
          <KeyRound className="text-amber-500" size={24} />
        </div>
        <p className="eyebrow">Récupération</p>
        <h1 className="mt-2 font-display text-3xl lg:text-4xl font-bold tracking-tight">Nouveau mot de passe</h1>
        <p className="mt-3 text-sm text-[#6B5F4E]">Choisissez un nouveau mot de passe pour accéder à votre compte KalliTag et à Lead Capture.</p>

        <form onSubmit={submit} className="kt-card mt-8 p-6 space-y-4">
          <div>
            <Label className="text-xs text-[#6B5F4E] mb-1.5 block">Nouveau mot de passe (8 caractères min.)</Label>
            <div className="relative">
              <Input type={showPw ? "text" : "password"} required minLength={8} value={password} autoFocus
                     onChange={(e) => setPassword(e.target.value)} data-testid="reset-password"
                     placeholder="••••••••"
                     className="bg-white/70 border-[#1F1B16]/10 focus:border-amber-400/60 text-[#1F1B16] pr-10" />
              <button type="button" onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B7F6E] hover:text-[#1F1B16]" data-testid="reset-toggle">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <Label className="text-xs text-[#6B5F4E] mb-1.5 block">Confirmer</Label>
            <Input type={showPw ? "text" : "password"} required value={confirm}
                   onChange={(e) => setConfirm(e.target.value)} data-testid="reset-confirm"
                   placeholder="••••••••"
                   className="bg-white/70 border-[#1F1B16]/10 focus:border-amber-400/60 text-[#1F1B16]" />
          </div>
          <button type="submit" disabled={loading || !password || password !== confirm}
                  className="kt-btn-gold w-full justify-center" data-testid="reset-submit">
            {loading ? <><Loader2 className="animate-spin" size={16} /> Enregistrement…</>
                     : <>Réinitialiser mon mot de passe <ArrowRight size={16} /></>}
          </button>
        </form>
      </div>
      <Footer />
    </div>
  );
}
