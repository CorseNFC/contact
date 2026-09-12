import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Gift, Check, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProfilePreview from "@/components/ProfilePreview";
import ThemeThumb from "@/components/ThemeThumb";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const THEMES = [
  { id: "onyx" }, { id: "ivory" }, { id: "midnight" },
  { id: "champagne" }, { id: "rose" }, { id: "sage" },
];

const empty = () => ({
  theme_id: "onyx", finish_id: "noir_mat", layout_id: "hero",
  first_name: "", last_name: "", job_title: "", company: "", tagline: "", bio: "",
  phone: "", email: "", avatar_url: "", hero_photo_url: "", logo_url: "",
  accent_color: "", text_colors: {}, gallery_urls: [],
  section_order: ["quick", "about", "gallery", "cta", "socials"],
  links: { linkedin: "", instagram: "", whatsapp: "", website: "", calendly: "", tiktok: "", youtube: "", facebook: "", twitter: "" },
});

export default function ClaimCard() {
  const { token } = useParams();
  const nav = useNavigate();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(empty());
  const [shipping, setShipping] = useState({ full_name: "", line1: "", line2: "", city: "", postal_code: "", country: "FR" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/nfc-claim/${token}`)
      .then((r) => { setInfo(r.data); if (r.data.status === "claimed") setError("Cette carte a déjà été réclamée."); })
      .catch(() => setError("Bon introuvable ou expiré."));
  }, [token]);

  const submit = async () => {
    if (!profile.first_name || !profile.last_name) { toast.error("Prénom et nom sont requis"); return; }
    if (!shipping.full_name || !shipping.line1 || !shipping.city || !shipping.postal_code) { toast.error("Adresse de livraison incomplète"); return; }
    setSubmitting(true);
    try {
      const r = await api.post(`/nfc-claim/${token}`, { profile, shipping });
      toast.success("Carte réclamée — nous l'expédions sous 3-5 jours ouvrés ! ");
      nav(`/p/${r.data.profile_slug}`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur lors de la réclamation");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#1F1B16]">
      <Navbar />
      <section className="pt-28 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-700 text-[10px] font-bold uppercase tracking-widest">
              <Gift size={12} /> Cadeau abonnement
            </div>
            <h1 className="mt-3 font-display text-4xl sm:text-5xl font-bold tracking-tight leading-[1.05]" data-testid="claim-hero">
              Personnalisez votre <span className="gold-text">carte NFC offerte</span>
            </h1>
            <p className="mt-4 text-base text-[#4A3F2E]">
              {info?.plan_name && <>Incluse avec votre abonnement <strong>{info.plan_name}</strong>. </>}
              Remplissez vos infos et votre adresse — nous expédions sous 3-5 jours.
            </p>
          </div>

          {error ? (
            <div className="max-w-md mx-auto text-center kt-card p-8" data-testid="claim-error">
              <p className="text-red-500 font-semibold">{error}</p>
            </div>
          ) : !info ? (
            <div className="grid place-items-center py-20"><Loader2 className="animate-spin text-amber-500" /></div>
          ) : (
            <div className="grid lg:grid-cols-[1fr_360px] gap-8" data-testid="claim-form">
              <div className="space-y-6">
                {/* Identité */}
                <div className="kt-card p-6">
                  <h3 className="eyebrow mb-4">1. Vos coordonnées</h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="Prénom *" value={profile.first_name} onChange={(v) => setProfile({ ...profile, first_name: v })} testid="cc-first-name" />
                    <Field label="Nom *" value={profile.last_name} onChange={(v) => setProfile({ ...profile, last_name: v })} testid="cc-last-name" />
                    <Field label="Poste" value={profile.job_title} onChange={(v) => setProfile({ ...profile, job_title: v })} testid="cc-job" />
                    <Field label="Entreprise" value={profile.company} onChange={(v) => setProfile({ ...profile, company: v })} testid="cc-company" />
                    <Field label="Téléphone" value={profile.phone} onChange={(v) => setProfile({ ...profile, phone: v })} testid="cc-phone" />
                    <Field label="Email public" value={profile.email} onChange={(v) => setProfile({ ...profile, email: v })} testid="cc-email" type="email" />
                  </div>
                </div>

                {/* Thème */}
                <div className="kt-card p-6">
                  <h3 className="eyebrow mb-4">2. Choisissez votre thème</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {THEMES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setProfile({ ...profile, theme_id: t.id })}
                        data-testid={`cc-theme-${t.id}`}
                        className={`p-2 rounded-xl border transition ${profile.theme_id === t.id ? "border-amber-500 ring-2 ring-amber-500/40" : "border-[#1F1B16]/10"}`}
                      >
                        <ThemeThumb themeId={t.id} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Livraison */}
                <div className="kt-card p-6">
                  <h3 className="eyebrow mb-4">3. Adresse de livraison</h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="Nom complet *" value={shipping.full_name} onChange={(v) => setShipping({ ...shipping, full_name: v })} testid="cc-ship-name" />
                    <Field label="Adresse *" value={shipping.line1} onChange={(v) => setShipping({ ...shipping, line1: v })} testid="cc-ship-line1" />
                    <Field label="Complément" value={shipping.line2} onChange={(v) => setShipping({ ...shipping, line2: v })} testid="cc-ship-line2" />
                    <Field label="Code postal *" value={shipping.postal_code} onChange={(v) => setShipping({ ...shipping, postal_code: v })} testid="cc-ship-postal" />
                    <Field label="Ville *" value={shipping.city} onChange={(v) => setShipping({ ...shipping, city: v })} testid="cc-ship-city" />
                    <Field label="Pays" value={shipping.country} onChange={(v) => setShipping({ ...shipping, country: v })} testid="cc-ship-country" />
                  </div>
                </div>

                <button onClick={submit} disabled={submitting} data-testid="cc-submit"
                  className="w-full h-14 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#8B6508] text-white font-bold text-base inline-flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition disabled:opacity-60">
                  {submitting ? <Loader2 className="animate-spin" size={18} /> : <><Check size={18} /> Recevoir ma carte offerte <ArrowRight size={18} /></>}
                </button>
              </div>

              {/* Aperçu */}
              <aside className="lg:sticky lg:top-24 h-fit">
                <p className="eyebrow mb-3 text-center">Aperçu de votre profil</p>
                <ProfilePreview profile={profile} />
              </aside>
            </div>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}

const Field = ({ label, value, onChange, testid, type = "text" }) => (
  <div>
    <Label className="text-xs text-[#6B5F4E] mb-1 block">{label}</Label>
    <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} data-testid={testid}
      className="rounded-xl border-[#1F1B16]/10 bg-white focus-visible:border-amber-500" />
  </div>
);
