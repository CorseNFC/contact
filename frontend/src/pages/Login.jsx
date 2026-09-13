import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Mail, Loader2, ArrowRight, Eye, EyeOff, KeyRound } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authLogin, requestMagicLink } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [mode, setMode] = useState("password"); // "password" | "magic"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submitPassword = async (e) => {
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

  const submitMagic = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await requestMagicLink(email.trim(), window.location.origin);
      setMagicSent(true);
      toast.success("Lien envoyé !");
    } catch {
      toast.error("Envoi impossible. Vérifiez l'email.");
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

        {magicSent ? (
          <div className="kt-card mt-8 p-8 text-center" data-testid="login-sent">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/10 grid place-items-center border border-amber-500/30">
              <Mail className="text-amber-500" size={24} />
            </div>
            <h2 className="mt-4 font-display font-bold text-xl">Vérifiez vos emails</h2>
            <p className="mt-2 text-sm text-[#6B5F4E]">
              Un lien de connexion a été envoyé à <span className="text-amber-600 font-semibold">{email}</span>. Il expire dans 20 minutes.
            </p>
            <button onClick={() => { setMagicSent(false); setMode("password"); }} className="mt-6 text-xs text-slate-500 hover:text-[#1F1B16]" data-testid="login-back-password">
              Retour à la connexion par mot de passe
            </button>
          </div>
        ) : mode === "password" ? (
          <form onSubmit={submitPassword} className="kt-card mt-8 p-6 space-y-4">
            <div>
              <Label className="text-xs text-[#6B5F4E] mb-1.5 block">Email</Label>
              <Input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)}
                     data-testid="login-email" placeholder="vous@entreprise.fr"
                     className="bg-white/70 border-[#1F1B16]/10 focus:border-amber-400/60 text-[#1F1B16]" />
            </div>
            <div>
              <Label className="text-xs text-[#6B5F4E] mb-1.5 block">Mot de passe</Label>
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
            <div className="flex items-center gap-3 pt-2">
              <div className="flex-1 h-px bg-[#1F1B16]/10" />
              <span className="text-[10px] uppercase tracking-widest text-[#8B7F6E]">ou</span>
              <div className="flex-1 h-px bg-[#1F1B16]/10" />
            </div>
            <button type="button" onClick={() => setMode("magic")} data-testid="login-switch-magic"
                    className="w-full h-11 rounded-full border-2 border-[#1F1B16]/10 text-sm font-semibold text-[#4A3F2E] hover:border-amber-400/60 hover:text-[#1F1B16] inline-flex items-center justify-center gap-2 transition">
              <KeyRound size={14} /> Mot de passe oublié ? Recevoir un lien
            </button>
            <p className="text-xs text-slate-500 text-center pt-1">
              Pas de compte ? <Link to="/inscription" className="text-amber-600 font-semibold hover:underline" data-testid="login-goto-signup">Créer un compte</Link>
            </p>
          </form>
        ) : (
          <form onSubmit={submitMagic} className="kt-card mt-8 p-6 space-y-4">
            <p className="text-xs text-[#6B5F4E]">On vous envoie un lien de connexion à usage unique par email. Vous pourrez ensuite définir un nouveau mot de passe.</p>
            <div>
              <Label className="text-xs text-[#6B5F4E] mb-1.5 block">Votre email</Label>
              <Input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)}
                     data-testid="login-magic-email" placeholder="vous@exemple.com"
                     className="bg-white/70 border-[#1F1B16]/10 focus:border-amber-400/60 text-[#1F1B16]" />
            </div>
            <button type="submit" disabled={loading || !email} className="kt-btn-gold w-full justify-center" data-testid="login-magic-submit">
              {loading ? <><Loader2 className="animate-spin" size={16} /> Envoi…</> : <>Recevoir mon lien <ArrowRight size={16} /></>}
            </button>
            <button type="button" onClick={() => setMode("password")} data-testid="login-switch-password" className="w-full text-xs text-slate-500 hover:text-[#1F1B16] pt-2">
              ← Retour au mot de passe
            </button>
          </form>
        )}
      </div>
      <Footer />
    </div>
  );
}
