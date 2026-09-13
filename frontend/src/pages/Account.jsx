import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Lock, CreditCard, Trash2, Zap, Package, LogOut, ExternalLink, ShieldCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authChangePassword, authDeleteAccount, proPortal, getMe } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function Account() {
  const nav = useNavigate();
  const { user, logout, loading: authLoading } = useAuth();
  const [me, setMe] = useState(null);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    if (!authLoading && !user) { nav("/connexion", { replace: true }); return; }
    if (user) getMe().then(setMe).catch(() => {});
  }, [user, authLoading, nav]);

  const submitPassword = async (e) => {
    e.preventDefault();
    if (newPw.length < 8) { toast.error("8 caractères minimum"); return; }
    if (newPw !== confirmPw) { toast.error("Les mots de passe ne correspondent pas"); return; }
    setBusy("pw");
    try {
      await authChangePassword(oldPw, newPw);
      toast.success("Mot de passe mis à jour");
      setOldPw(""); setNewPw(""); setConfirmPw("");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Impossible");
    } finally { setBusy(""); }
  };

  const openBilling = async () => {
    setBusy("portal");
    try {
      const r = await proPortal(window.location.href);
      window.location.href = r.url;
    } catch (err) {
      toast.error(err.response?.data?.detail || "Aucun abonnement Stripe trouvé");
    } finally { setBusy(""); }
  };

  const doDelete = async () => {
    const pw = window.prompt("Confirmez avec votre mot de passe pour supprimer définitivement votre compte :");
    if (pw === null) return;
    setBusy("delete");
    try {
      await authDeleteAccount(pw);
      toast.success("Compte supprimé");
      logout();
      nav("/", { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Suppression impossible");
    } finally { setBusy(""); }
  };

  if (authLoading || !me) {
    return <div className="min-h-screen grid place-items-center bg-[#FAF7F0]"><Loader2 className="animate-spin text-amber-500" /></div>;
  }

  const ordersCount = (me.orders || []).length;
  const lcActive = !!me.lead_capture_active;
  const subStatus = me.subscription_status;

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#1F1B16]">
      <Navbar />
      <div className="pt-28 pb-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8" data-testid="account-page">
        <p className="eyebrow">Mon compte</p>
        <div className="mt-2 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight">{me.name || me.email.split("@")[0]}</h1>
            <p className="mt-1 text-sm text-[#6B5F4E]">{me.email}</p>
          </div>
          <button onClick={() => { logout(); nav("/"); }} className="kt-btn-ghost text-xs inline-flex items-center gap-2" data-testid="account-logout">
            <LogOut size={14} /> Se déconnecter
          </button>
        </div>

        {/* Overview cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="kt-card p-5" data-testid="account-card-lc">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 grid place-items-center text-emerald-600 mb-3">
              <Zap size={18} />
            </div>
            <p className="text-xs text-[#6B5F4E] uppercase tracking-wider">Lead Capture</p>
            <p className={`mt-1 font-display font-bold text-xl ${lcActive ? "text-emerald-600" : "text-[#8B7F6E]"}`}>
              {lcActive ? "Actif" : "Inactif"}
            </p>
            {me.subscription_plan && <p className="text-xs text-[#8B7F6E] mt-0.5">Plan {me.subscription_plan}</p>}
          </div>
          <div className="kt-card p-5" data-testid="account-card-sub">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 grid place-items-center text-amber-600 mb-3">
              <CreditCard size={18} />
            </div>
            <p className="text-xs text-[#6B5F4E] uppercase tracking-wider">Abonnement</p>
            <p className="mt-1 font-display font-bold text-xl">{subStatus || "—"}</p>
            <p className="text-xs text-[#8B7F6E] mt-0.5">{me.stripe_customer_id ? "Client Stripe lié" : "Pas d'abonnement Stripe"}</p>
          </div>
          <div className="kt-card p-5" data-testid="account-card-orders">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 grid place-items-center text-indigo-600 mb-3">
              <Package size={18} />
            </div>
            <p className="text-xs text-[#6B5F4E] uppercase tracking-wider">Commandes</p>
            <p className="mt-1 font-display font-bold text-xl">{ordersCount}</p>
            <p className="text-xs text-[#8B7F6E] mt-0.5">{ordersCount > 0 ? "cartes commandées" : "aucune pour l'instant"}</p>
          </div>
        </div>

        {/* Stripe billing portal */}
        <section className="mt-10 kt-card p-6" data-testid="account-billing">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h2 className="font-display font-bold text-xl inline-flex items-center gap-2">
                <CreditCard size={18} className="text-amber-500" /> Gérer mon abonnement
              </h2>
              <p className="mt-2 text-sm text-[#6B5F4E] max-w-xl">
                Accédez au portail Stripe pour mettre à jour votre carte, télécharger vos factures ou annuler votre abonnement.
              </p>
            </div>
            <button
              onClick={openBilling} disabled={busy === "portal" || !me.stripe_customer_id}
              data-testid="account-open-portal"
              className="kt-btn-gold text-sm inline-flex items-center gap-2 disabled:opacity-50"
            >
              {busy === "portal" ? <Loader2 className="animate-spin" size={14} />
                                 : <>Ouvrir Stripe <ExternalLink size={14} /></>}
            </button>
          </div>
          {!me.stripe_customer_id && (
            <p className="mt-3 text-xs text-[#8B7F6E]">Souscrivez à un plan sur <a href="/tarifs" className="text-amber-600 font-semibold hover:underline">/tarifs</a> pour activer cette section.</p>
          )}
        </section>

        {/* Change password */}
        <section className="mt-6 kt-card p-6" data-testid="account-password">
          <h2 className="font-display font-bold text-xl inline-flex items-center gap-2">
            <Lock size={18} className="text-amber-500" /> Changer mon mot de passe
          </h2>
          {me.has_password ? (
            <form onSubmit={submitPassword} className="mt-5 grid md:grid-cols-3 gap-3 max-w-3xl">
              <div>
                <Label className="text-xs text-[#6B5F4E] mb-1.5 block">Actuel</Label>
                <Input type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} required data-testid="pw-old"
                       className="bg-white border-[#1F1B16]/10 focus:border-amber-400/60" />
              </div>
              <div>
                <Label className="text-xs text-[#6B5F4E] mb-1.5 block">Nouveau</Label>
                <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required minLength={8} data-testid="pw-new"
                       className="bg-white border-[#1F1B16]/10 focus:border-amber-400/60" />
              </div>
              <div>
                <Label className="text-xs text-[#6B5F4E] mb-1.5 block">Confirmer</Label>
                <Input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required data-testid="pw-confirm"
                       className="bg-white border-[#1F1B16]/10 focus:border-amber-400/60" />
              </div>
              <div className="md:col-span-3">
                <button type="submit" disabled={busy === "pw"} className="kt-btn-gold text-sm inline-flex items-center gap-2" data-testid="pw-submit">
                  {busy === "pw" ? <Loader2 className="animate-spin" size={14} /> : "Mettre à jour"}
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-[#4A3F2E]">
              <p className="inline-flex items-center gap-2 font-semibold"><ShieldCheck size={16} className="text-amber-600" /> Aucun mot de passe défini</p>
              <p className="mt-1.5 text-[#6B5F4E]">Redemandez un lien de connexion depuis <a href="/connexion" className="text-amber-600 font-semibold hover:underline">/connexion</a> puis définissez votre mot de passe.</p>
            </div>
          )}
        </section>

        {/* Danger zone */}
        <section className="mt-6 kt-card p-6 border-red-500/30" data-testid="account-danger">
          <h2 className="font-display font-bold text-xl inline-flex items-center gap-2 text-red-700">
            <Trash2 size={18} /> Supprimer mon compte
          </h2>
          <p className="mt-2 text-sm text-[#6B5F4E] max-w-xl">
            Action irréversible. Vos profils NFC restent actifs (associés à vos commandes), mais votre accès Lead Capture et votre historique de compte sont supprimés.
          </p>
          <button onClick={doDelete} disabled={busy === "delete"}
                  className="mt-4 text-sm font-semibold rounded-full border-2 border-red-500 text-red-700 px-5 py-2 hover:bg-red-500 hover:text-white transition disabled:opacity-50"
                  data-testid="account-delete">
            {busy === "delete" ? <Loader2 className="animate-spin inline" size={14} /> : "Supprimer définitivement"}
          </button>
        </section>
      </div>
      <Footer />
    </div>
  );
}
