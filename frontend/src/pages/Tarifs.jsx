import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Check, ArrowRight, Sparkles, Crown, Users, ShieldCheck, Zap,
  Loader2, TrendingDown, Gift,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { api } from "@/lib/api";

// ============================================================
// Marketing pricing grid (display only — Stripe products keep their own prices)
// ============================================================
const PLANS = [
  {
    slug: "solo",
    name: "Solo",
    icon: Zap,
    accent: "from-emerald-400 to-emerald-600",
    price_eur: "24,90",
    unit: "/ mois",
    subtitle: "1 utilisateur",
    seats_label: "1 licence",
    // Internal Stripe wiring — do NOT change unless Stripe products change too
    checkout: { plan_id: "lead_capture", seats: 1 },
    features: [
      "OCR carte de visite IA",
      "Scan NFC KalliTag + saisie manuelle",
      "Débriefs vocaux IA",
      "Formulaire auto-rempli",
      "Score de conversion IA",
      "Export PDF + relance email automatique",
      "1 utilisateur",
    ],
  },
  {
    slug: "equipe",
    name: "Équipe",
    icon: Users,
    accent: "from-[#D4AF37] to-[#8B6508]",
    price_eur: "21,90",
    unit: "/ licence / mois",
    subtitle: "2 à 9 licences",
    seats_label: "2 à 9 licences",
    badge: "POPULAIRE",
    highlight: true,
    checkout: { plan_id: "team", seats: 3, min: 2, max: 9 },
    features: [
      "Tout le plan Solo",
      "Dashboard manager + collaboration temps réel",
      "Sync CRM 1-clic (HubSpot & Salesforce)",
      "Rôles Manager / Commercial",
      "2 à 9 licences",
    ],
  },
  {
    slug: "entreprise",
    name: "Entreprise",
    icon: Crown,
    accent: "from-indigo-500 to-purple-700",
    price_eur: "19,90",
    unit: "/ licence / mois",
    subtitle: "10 licences et +",
    seats_label: "10 licences et +",
    badge: "MEILLEUR TARIF",
    checkout: { plan_id: "team", seats: 10, min: 10, max: 50 },
    features: [
      "Tout le plan Équipe",
      "Archivage automatique CRM",
      "Comparateur différentiel IA entre commerciaux",
      "Synthèse de compte + graphe d'évolution",
      "10 licences et plus (prix plancher)",
      "Support dédié + onboarding équipe",
    ],
  },
];


export default function Tarifs() {
  const [loadingSlug, setLoadingSlug] = useState(null);
  const [email, setEmail] = useState("");
  const [seatsBySlug, setSeatsBySlug] = useState({ equipe: 3, entreprise: 10 });
  const [highlightSlug, setHighlightSlug] = useState(null);
  const [params] = useSearchParams();

  useEffect(() => {
    if (params.get("cancelled")) toast.info("Paiement annulé — vous pouvez réessayer.");
    const slug = (params.get("plan") || "").toLowerCase();
    // legacy slug aliases → new slugs
    const map = { "lead-capture": "solo", "all-in-one": "equipe", "team": "entreprise" };
    const resolved = map[slug] || slug;
    if (PLANS.some((p) => p.slug === resolved)) {
      setHighlightSlug(resolved);
      setTimeout(() => {
        const el = document.querySelector(`[data-testid="plan-${resolved}"]`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 350);
    }
  }, [params]);

  const subscribe = async (plan) => {
    const em = (email || "").trim();
    if (!em) {
      toast.error("Merci de renseigner votre email d'abord");
      document.getElementById("sub-email")?.focus();
      return;
    }
    setLoadingSlug(plan.slug);
    try {
      const seats = plan.checkout.min ? seatsBySlug[plan.slug] || plan.checkout.seats : plan.checkout.seats;
      const r = await api.post("/subscribe/checkout", {
        plan_id: plan.checkout.plan_id,
        interval: "monthly",
        email: em,
        seats,
        origin_url: window.location.origin,
      });
      window.location.href = r.data.checkout_url;
    } catch (e) {
      const msg = e.response?.data?.detail || "Impossible de démarrer le paiement";
      toast.error(msg);
    } finally { setLoadingSlug(null); }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#1F1B16]">
      <Navbar />

      <section className="pt-32 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                      className="text-center max-w-2xl mx-auto" data-testid="pricing-hero">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/40 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700 shadow-sm" data-testid="trial-badge">
              <Gift size={11} /> Essai gratuit 7 jours · sans carte bancaire
            </div>
            <p className="mt-4 eyebrow">Abonnements Lead Capture</p>
            <h1 className="mt-3 font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
              Le bon plan pour <span className="gold-text">convertir plus</span>
            </h1>
            <p className="mt-5 text-base text-[#4A3F2E] leading-relaxed">
              Choisissez la formule qui correspond à votre équipe. Résiliable à tout moment. Satisfait ou remboursé 14 jours.
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700" data-testid="degressive-mention">
              <TrendingDown size={13} /> Tarif dégressif : le prix par licence baisse dès 2 licences.
            </div>
          </motion.div>

          {/* Email requis avant checkout */}
          <div className="mt-8 max-w-md mx-auto">
            <label className="text-xs font-medium text-[#6B5F4E] uppercase tracking-wider mb-1.5 block text-center">Votre email pro</label>
            <input
              id="sub-email" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@entreprise.fr"
              data-testid="sub-email"
              className="w-full px-4 py-3 rounded-full bg-white border border-[#1F1B16]/10 text-center text-sm focus:border-amber-500 focus:outline-none shadow-sm"
            />
          </div>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6" data-testid="plans-grid">
            {PLANS.map((p) => {
              const Icon = p.icon;
              const isHighlighted = highlightSlug === p.slug;
              const isPopular = p.highlight || isHighlighted;
              return (
                <motion.div
                  key={p.slug}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className={`relative rounded-3xl bg-white p-7 border shadow-md hover:shadow-xl transition ${isHighlighted ? "border-amber-500 ring-4 ring-amber-500/50 md:scale-105" : isPopular ? "border-amber-500 ring-2 ring-amber-500/40 md:scale-105" : "border-[#1F1B16]/10"}`}
                  data-testid={`plan-${p.slug}`}
                >
                  {isHighlighted && (
                    <span data-testid={`plan-${p.slug}-preselected`} className="sr-only">preselected</span>
                  )}
                  {p.badge && (
                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-white bg-gradient-to-r ${p.accent} shadow-md`}>
                      {p.badge}
                    </div>
                  )}
                  {isHighlighted && !p.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-white bg-gradient-to-r from-amber-500 to-amber-700 shadow-md">
                      RECOMMANDÉ POUR VOUS
                    </div>
                  )}

                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${p.accent} grid place-items-center text-white mb-4 shadow-md`}>
                    <Icon size={22} />
                  </div>
                  <h3 className="font-display font-bold text-2xl">{p.name}</h3>
                  <p className="text-sm text-[#6B5F4E] mt-1">{p.subtitle}</p>

                  <div className="mt-6">
                    <div className="flex items-baseline gap-1">
                      <span className="font-display font-black text-5xl gold-text" data-testid={`plan-${p.slug}-price`}>
                        {p.price_eur}&nbsp;€
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#8B7F6E]">{p.unit}</p>
                    <p className="text-[11px] text-[#8B7F6E]">{p.seats_label}</p>
                  </div>

                  {p.checkout.min && (
                    <div className="mt-4 flex items-center justify-between rounded-xl border border-[#1F1B16]/10 px-3 py-2 bg-[#F7F3EC]">
                      <span className="text-xs text-[#6B5F4E]">Nombre de licences</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSeatsBySlug((s) => ({ ...s, [p.slug]: Math.max(p.checkout.min, (s[p.slug] || p.checkout.seats) - 1) }))}
                          className="w-7 h-7 rounded-full border border-[#1F1B16]/10 grid place-items-center font-bold active:scale-90"
                          data-testid={`${p.slug}-seats-minus`}>−</button>
                        <span className="font-mono w-8 text-center" data-testid={`${p.slug}-seats-value`}>{seatsBySlug[p.slug] || p.checkout.seats}</span>
                        <button
                          onClick={() => setSeatsBySlug((s) => ({ ...s, [p.slug]: Math.min(p.checkout.max, (s[p.slug] || p.checkout.seats) + 1) }))}
                          className="w-7 h-7 rounded-full border border-[#1F1B16]/10 grid place-items-center font-bold active:scale-90"
                          data-testid={`${p.slug}-seats-plus`}>+</button>
                      </div>
                    </div>
                  )}

                  <ul className="mt-6 space-y-2.5">
                    {p.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-[#1F1B16]">
                        <Check size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => subscribe(p)}
                    disabled={loadingSlug === p.slug}
                    data-testid={`subscribe-${p.slug}`}
                    className={`mt-7 w-full h-12 rounded-full font-bold text-sm inline-flex items-center justify-center gap-2 transition shadow-lg active:scale-[0.98] ${isPopular ? "bg-gradient-to-br from-[#D4AF37] to-[#8B6508] text-white" : "bg-[#1F1B16] text-white hover:bg-[#4A3F2E]"} disabled:opacity-60`}
                  >
                    {loadingSlug === p.slug
                      ? <Loader2 className="animate-spin" size={16} />
                      : <>Commencer l'essai gratuit <ArrowRight size={16} /></>}
                  </button>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-14 flex flex-wrap justify-center gap-6 text-xs text-[#6B5F4E]">
            <div className="flex items-center gap-1.5"><ShieldCheck size={15} className="text-amber-500" /> Satisfait ou remboursé 14 jours</div>
            <div className="flex items-center gap-1.5"><Crown size={15} className="text-amber-500" /> Résiliable en 1 clic</div>
            <div className="flex items-center gap-1.5"><Check size={15} className="text-amber-500" /> Paiement sécurisé Stripe</div>
            <div className="flex items-center gap-1.5"><Sparkles size={15} className="text-amber-500" /> Aucune carte bancaire pendant l'essai</div>
          </div>

          <div className="mt-16 text-center max-w-xl mx-auto">
            <h3 className="font-display font-bold text-2xl">Besoin d'une démo ou d'une facturation entreprise ?</h3>
            <p className="mt-2 text-sm text-[#6B5F4E]">Écrivez-nous à <a href="mailto:contact@kallitag.fr" className="text-amber-600 font-semibold hover:underline">contact@kallitag.fr</a> — réponse sous 24h.</p>
            <Link to="/configurateur" className="kt-btn-ghost mt-6 inline-flex" data-testid="tarifs-cta-single">
              Ou commander une seule carte NFC <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
