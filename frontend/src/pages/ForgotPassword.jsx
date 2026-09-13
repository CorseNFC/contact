import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, ArrowRight, Mail, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authForgotPassword } from "@/lib/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await authForgotPassword(email.trim(), window.location.origin);
      setSent(true);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Envoi impossible");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#1F1B16]">
      <Navbar />
      <div className="pt-32 pb-24 max-w-md mx-auto px-4" data-testid="forgot-password-page">
        <p className="eyebrow">Mot de passe oublié</p>
        <h1 className="mt-2 font-display text-3xl lg:text-4xl font-bold tracking-tight">Réinitialiser</h1>
        <p className="mt-3 text-sm text-[#6B5F4E]">Entrez votre email — vous recevrez un lien pour choisir un nouveau mot de passe. Le lien expire dans 30 minutes.</p>

        {sent ? (
          <div className="kt-card mt-8 p-8 text-center" data-testid="forgot-sent">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/10 grid place-items-center border border-amber-500/30">
              <Mail className="text-amber-500" size={24} />
            </div>
            <h2 className="mt-4 font-display font-bold text-xl">Email envoyé</h2>
            <p className="mt-2 text-sm text-[#6B5F4E]">Si un compte existe avec <span className="font-semibold">{email}</span>, un email de réinitialisation vient de partir.</p>
            <p className="mt-4 text-xs text-[#8B7F6E]">Pensez à vérifier vos spams.</p>
            <Link to="/connexion" className="mt-6 inline-flex items-center gap-1.5 text-xs text-[#4A3F2E] hover:text-[#1F1B16]" data-testid="forgot-back-login">
              <ArrowLeft size={12} /> Retour à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="kt-card mt-8 p-6 space-y-4">
            <div>
              <Label className="text-xs text-[#6B5F4E] mb-1.5 block">Votre email</Label>
              <Input type="email" required autoFocus value={email}
                     onChange={(e) => setEmail(e.target.value)} data-testid="forgot-email"
                     placeholder="vous@entreprise.fr"
                     className="bg-white/70 border-[#1F1B16]/10 focus:border-amber-400/60 text-[#1F1B16]" />
            </div>
            <button type="submit" disabled={loading || !email} className="kt-btn-gold w-full justify-center" data-testid="forgot-submit">
              {loading ? <><Loader2 className="animate-spin" size={16} /> Envoi…</>
                       : <>Recevoir le lien <ArrowRight size={16} /></>}
            </button>
            <Link to="/connexion" className="block text-center text-xs text-slate-500 hover:text-[#1F1B16] pt-2" data-testid="forgot-back">
              ← Retour à la connexion
            </Link>
          </form>
        )}
      </div>
      <Footer />
    </div>
  );
}
