import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, ArrowRight, Eye, EyeOff, UserPlus } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authRegister } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function Signup() {
  const nav = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (form.password.length < 8) { toast.error("Le mot de passe doit faire au moins 8 caractères."); return; }
    setLoading(true);
    try {
      const r = await authRegister(form);
      await login(r.session_token);
      toast.success("Compte créé !");
      nav("/mon-compte", { replace: true });
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (err.response?.status === 409) toast.error("Un compte existe déjà avec cet email. Connectez-vous.");
      else toast.error(typeof detail === "string" ? detail : "Inscription impossible");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#1F1B16]">
      <Navbar />
      <div className="pt-32 pb-24 max-w-md mx-auto px-4" data-testid="signup-page">
        <p className="eyebrow">Créer un compte</p>
        <h1 className="mt-2 font-display text-3xl lg:text-4xl font-bold tracking-tight">Bienvenue chez KalliTag</h1>
        <p className="mt-3 text-sm text-[#6B5F4E]">Créez votre espace pour gérer vos cartes, votre abonnement Lead Capture et vos commandes.</p>

        <form onSubmit={submit} className="kt-card mt-8 p-6 space-y-4">
          <div>
            <Label className="text-xs text-[#6B5F4E] mb-1.5 block">Nom complet <span className="text-[#8B7F6E]">(optionnel)</span></Label>
            <Input
              type="text" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              data-testid="signup-name" placeholder="Jean Dupont"
              className="bg-white/70 border-[#1F1B16]/10 focus:border-amber-400/60 text-[#1F1B16]"
            />
          </div>
          <div>
            <Label className="text-xs text-[#6B5F4E] mb-1.5 block">Email pro</Label>
            <Input
              type="email" required autoFocus value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              data-testid="signup-email" placeholder="vous@entreprise.fr"
              className="bg-white/70 border-[#1F1B16]/10 focus:border-amber-400/60 text-[#1F1B16]"
            />
          </div>
          <div>
            <Label className="text-xs text-[#6B5F4E] mb-1.5 block">Mot de passe <span className="text-[#8B7F6E]">(8 caractères min.)</span></Label>
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"} required minLength={8} value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                data-testid="signup-password" placeholder="••••••••"
                className="bg-white/70 border-[#1F1B16]/10 focus:border-amber-400/60 text-[#1F1B16] pr-10"
              />
              <button type="button" onClick={() => setShowPw((v) => !v)} data-testid="signup-toggle-pw"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B7F6E] hover:text-[#1F1B16]">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading || !form.email || !form.password}
                  className="kt-btn-gold w-full justify-center" data-testid="signup-submit">
            {loading ? <><Loader2 className="animate-spin" size={16} /> Création…</>
                     : <>Créer mon compte <ArrowRight size={16} /></>}
          </button>
          <p className="text-xs text-slate-500 text-center pt-1">
            Déjà un compte ? <Link to="/connexion" className="text-amber-600 font-semibold hover:underline">Se connecter</Link>
          </p>
        </form>
      </div>
      <Footer />
    </div>
  );
}
