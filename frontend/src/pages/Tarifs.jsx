import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Check, ArrowRight, Sparkles, Crown, Users, ShieldCheck, Zap, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { api, formatEUR } from "@/lib/api";

const PLAN_ICONS = { lead_capture: Zap, all_in_one: Sparkles, team: Users };
const PLAN_ACCENTS = {
  lead_capture: "from-emerald-400 to-emerald-600",
  all_in_one:   "from-[#D4AF37] to-[#8B6508]",
  team:         "from-indigo-400 to-indigo-700",
};

export default function Tarifs() {
  const [plans, setPlans] = useState(null);
  const [interval, setInterval] = useState("monthly");
  const [email, setEmail] = useState("");
  const [seatsByPlan, setSeatsByPlan] = useState({ team: 3 });
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [params] = useSearchParams();

  useEffect(() => {
    api.get("/subscription-plans").then((r) => setPlans(r.data.plans));
    if (params.get("cancelled")) toast.info("Paiement annulé — vous pouvez réessayer.");
  }, [params]);

  const subscribe = async (plan) => {
    const em = (email || "").trim();
    if (!em) { toast.error("Merci de renseigner votre email d'abord"); document.getElementById("sub-email")?.focus(); return; }
    setLoadingPlan(plan.id);
    try {
      const seats = plan.id === "team" ? Math.max(plan.min_seats, seatsByPlan.team || 3) : 1;
      const r = await api.post("/subscribe/checkout", {
        plan_id: plan.id, interval, email: em, seats,
        origin_url: window.location.origin,
      });
      window.location.href = r.data.checkout_url;
    } catch (e) {
      const msg = e.response?.data?.detail || "Impossible de démarrer le paiement";
      toast.error(msg);
    } finally { setLoadingPlan(null); }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#1F1B16]">
      <Navbar />
      <section className="pt-32 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-2xl mx-auto" data-testid="pricing-hero">
            <p className="eyebrow">Abonnements</p>
            <h1 className="mt-3 font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
              Le bon plan pour <span className="gold-text">convertir plus</span>
            </h1>
            <p className="mt-5 text-base text-[#4A3F2E] leading-relaxed">
              Choisissez la formule qui correspond à votre activité. Résiliable à tout moment. Satisfait ou remboursé 14 jours.
            </p>
          </motion.div>

          {/* Toggle monthly / yearly */}
          <div className="mt-8 flex justify-center">
            <div className="inline-flex rounded-full border border-[#1F1B16]/10 p-1 bg-white shadow-sm" data-testid="interval-toggle">
              {["monthly", "yearly"].map((k) => (
                <button
                  key={k}
                  onClick={() => setInterval(k)}
                  data-testid={`interval-${k}`}
                  className={`px-5 py-2 rounded-full text-sm font-semibold transition ${interval === k ? "bg-gradient-to-br from-[#D4AF37] to-[#8B6508] text-white shadow-md" : "text-[#6B5F4E]"}`}
                >
                  {k === "monthly" ? "Mensuel" : "Annuel"}
                  {k === "yearly" && <span className="ml-2 text-[10px] font-bold uppercase tracking-widest bg-emerald-100 text-emerald-800 rounded-full px-1.5 py-0.5">−2 mois</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Email requis avant checkout */}
          <div className="mt-6 max-w-md mx-auto">
            <label className="text-xs font-medium text-[#6B5F4E] uppercase tracking-wider mb-1.5 block text-center">Votre email pro</label>
            <input
              id="sub-email"
              type="email"
              value={email}
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
          {!plans ? (
            <div className="grid place-items-center py-20"><Loader2 className="animate-spin text-amber-400" /></div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6" data-testid="plans-grid">
              {plans.map((p) => {
                const price = interval === "yearly" ? p.price_yearly_cents : p.price_monthly_cents;
                const Icon = PLAN_ICONS[p.id] || Sparkles;
                const gradient = PLAN_ACCENTS[p.id] || PLAN_ACCENTS.lead_capture;
                const isPopular = p.badge === "PLUS POPULAIRE";
                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    className={`relative rounded-3xl bg-white p-7 border shadow-md hover:shadow-xl transition ${isPopular ? "border-amber-500 ring-2 ring-amber-500/40 md:scale-105" : "border-[#1F1B16]/10"}`}
                    data-testid={`plan-${p.id}`}
                  >
                    {p.badge && (
                      <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-white bg-gradient-to-r ${gradient} shadow-md`}>
                        {p.badge}
                      </div>
                    )}
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} grid place-items-center text-white mb-4 shadow-md`}>
                      <Icon size={22} />
                    </div>
                    <h3 className="font-display font-bold text-2xl">{p.name}</h3>
                    <p className="text-sm text-[#6B5F4E] mt-1">{p.tagline}</p>

                    <div className="mt-6">
                      <div className="flex items-baseline gap-2">
                        <span className="font-display font-black text-5xl gold-text" data-testid={`plan-${p.id}-price`}>{formatEUR(price)}</span>
                        <span className="text-sm text-[#8B7F6E]">{interval === "yearly" ? "/an" : "/mois"}</span>
                      </div>
                      {p.id === "team" && <p className="mt-1 text-[11px] text-[#8B7F6E]">par licence · minimum {p.min_seats}</p>}
                      {interval === "yearly" && p.price_monthly_cents * 12 > p.price_yearly_cents && (
                        <p className="mt-1 text-[11px] text-emerald-700 font-semibold">
                          Économie {formatEUR(p.price_monthly_cents * 12 - p.price_yearly_cents)}/an
                        </p>
                      )}
                    </div>

                    {p.id === "team" && (
                      <div className="mt-4 flex items-center justify-between rounded-xl border border-[#1F1B16]/10 px-3 py-2 bg-[#F7F3EC]">
                        <span className="text-xs text-[#6B5F4E]">Nombre de licences</span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setSeatsByPlan((s) => ({ ...s, team: Math.max(p.min_seats, (s.team || 3) - 1) }))} className="w-7 h-7 rounded-full border border-[#1F1B16]/10 grid place-items-center font-bold active:scale-90" data-testid="team-seats-minus">−</button>
                          <span className="font-mono w-6 text-center" data-testid="team-seats-value">{seatsByPlan.team || 3}</span>
                          <button onClick={() => setSeatsByPlan((s) => ({ ...s, team: Math.min(p.max_seats, (s.team || 3) + 1) }))} className="w-7 h-7 rounded-full border border-[#1F1B16]/10 grid place-items-center font-bold active:scale-90" data-testid="team-seats-plus">+</button>
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
                      disabled={loadingPlan === p.id}
                      data-testid={`subscribe-${p.id}`}
                      className={`mt-7 w-full h-12 rounded-full font-bold text-sm inline-flex items-center justify-center gap-2 transition shadow-lg active:scale-[0.98] ${isPopular ? "bg-gradient-to-br from-[#D4AF37] to-[#8B6508] text-white" : "bg-[#1F1B16] text-white hover:bg-[#4A3F2E]"} disabled:opacity-60`}
                    >
                      {loadingPlan === p.id ? <Loader2 className="animate-spin" size={16} /> : <>S'abonner <ArrowRight size={16} /></>}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}

          <div className="mt-14 flex flex-wrap justify-center gap-6 text-xs text-[#6B5F4E]">
            <div className="flex items-center gap-1.5"><ShieldCheck size={15} className="text-amber-500" /> Satisfait ou remboursé 14 jours</div>
            <div className="flex items-center gap-1.5"><Crown size={15} className="text-amber-500" /> Résiliable en 1 clic</div>
            <div className="flex items-center gap-1.5"><Check size={15} className="text-amber-500" /> Paiement sécurisé Stripe</div>
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
