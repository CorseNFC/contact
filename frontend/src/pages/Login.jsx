import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Mail, Loader2, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestMagicLink } from "@/lib/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      await requestMagicLink(email.trim(), window.location.origin);
      setSent(true);
      toast.success("Lien envoyé !");
    } catch (err) {
      console.error(err);
      toast.error("Envoi impossible. Vérifiez l'email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#1F1B16]">
      <Navbar />
      <div className="pt-32 pb-24 max-w-md mx-auto px-4" data-testid="login-page">
        <p className="eyebrow">Espace client</p>
        <h1 className="mt-2 font-display text-3xl lg:text-4xl font-bold tracking-tight">Connectez-vous</h1>
        <p className="mt-3 text-sm text-[#6B5F4E]">Entrez l'email utilisé lors de votre commande. Vous recevrez un lien de connexion sécurisé (pas de mot de passe).</p>

        {sent ? (
          <div className="kt-card mt-8 p-8 text-center" data-testid="login-sent">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/10 grid place-items-center border border-amber-500/30">
              <Mail className="text-amber-400" size={24} />
            </div>
            <h2 className="mt-4 font-display font-bold text-xl">Vérifiez vos emails</h2>
            <p className="mt-2 text-sm text-[#6B5F4E]">Un lien de connexion a été envoyé à <span className="text-amber-400">{email}</span>. Il expire dans 20 minutes.</p>
            <button onClick={() => setSent(false)} className="mt-6 text-xs text-slate-500 hover:text-[#4A3F2E]" data-testid="login-retry">
              Utiliser un autre email
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="kt-card mt-8 p-6 space-y-4">
            <div>
              <Label className="text-xs text-[#6B5F4E] mb-1.5 block">Votre email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                data-testid="login-email"
                placeholder="vous@exemple.com"
                className="bg-white/70 border-[#1F1B16]/10 focus:border-amber-400/60 focus:ring-amber-400/20 text-[#1F1B16]"
              />
            </div>
            <button type="submit" disabled={loading || !email} className="kt-btn-gold w-full justify-center" data-testid="login-submit">
              {loading ? <><Loader2 className="animate-spin" size={16} /> Envoi...</> : <>Recevoir mon lien <ArrowRight size={16} /></>}
            </button>
            <p className="text-xs text-slate-500 text-center">Pas encore de carte ? <Link to="/configurateur" className="text-amber-400 hover:underline">Commander</Link></p>
          </form>
        )}
      </div>
      <Footer />
    </div>
  );
}
