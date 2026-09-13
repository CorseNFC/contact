import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Mail, Loader2, ArrowRight, Eye, EyeOff, KeyRound } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authLogin } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const r = await authLogin(email.trim(), password);
      await login(r.session_token);
      nav("/mon-compte", { replace: true });
    } catch (err) {
      const s = err.response?.status;
      if (s === 429) toast.error("Trop de tentatives. Réessayez dans quelques minutes.");
      else toast.error("Email ou mot de passe incorrect");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#1F1B16]">
      <Navbar />
      <div className="pt-32 pb-24 max-w-md mx-auto px-4" data-testid="login-page">
        <p className="eyebrow">Espace client</p>
        <h1 className="mt-2 font-display text-3xl lg:text-4xl font-bold tracking-tight">Connectez-vous</h1>
        <p className="mt-3 text-sm text-[#6B5F4E]">
          Accédez à votre compte, votre abonnement Lead Capture et vos commandes.
        </p>

        <form onSubmit={submit} className="kt-card mt-8 p-6 space-y-4">
          <div>
            <Label className="text-xs text-[#6B5F4E] mb-1.5 block">Email</Label>
            <Input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)}
                   data-testid="login-email" placeholder="vous@entreprise.fr"
                   className="bg-white/70 border-[#1F1B16]/10 focus:border-amber-400/60 text-[#1F1B16]" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs text-[#6B5F4E]">Mot de passe</Label>
              <Link to="/mot-de-passe-oublie" className="text-xs text-amber-600 hover:underline" data-testid="login-forgot">
                Mot de passe oublié ?
              </Link>
            </div>
            <div className="relative">
              <Input type={showPw ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                     data-testid="login-password" placeholder="••••••••"
                     className="bg-white/70 border-[#1F1B16]/10 focus:border-amber-400/60 text-[#1F1B16] pr-10" />
              <button type="button" onClick={() => setShowPw((v) => !v)} data-testid="login-toggle-pw"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B7F6E] hover:text-[#1F1B16]">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading || !email || !password} className="kt-btn-gold w-full justify-center" data-testid="login-submit">
            {loading ? <><Loader2 className="animate-spin" size={16} /> Connexion…</> : <>Se connecter <ArrowRight size={16} /></>}
          </button>
          <p className="text-xs text-slate-500 text-center pt-1">
            Pas de compte ? <Link to="/inscription" className="text-amber-600 font-semibold hover:underline" data-testid="login-goto-signup">Créer un compte</Link>
          </p>
        </form>
      </div>
      <Footer />
    </div>
  );
}
