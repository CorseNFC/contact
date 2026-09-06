import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CardPreview from "@/components/CardPreview";
import { useConfig } from "@/context/ConfigContext";
import { fetchProducts, startCheckout, formatEUR } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function Configurator() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [data, setData] = useState(null);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const cfg = useConfig();

  useEffect(() => {
    fetchProducts().then((d) => {
      setData(d);
      const initial = params.get("p");
      if (initial && d.products.find((p) => p.id === initial)) cfg.setProductId(initial);
    });
    // eslint-disable-next-line
  }, []);

  if (!data) {
    return <div className="min-h-screen grid place-items-center bg-slate-950"><Loader2 className="animate-spin text-amber-400" /></div>;
  }

  const product = data.products.find((p) => p.id === cfg.productId);
  const total = product.price_cents * cfg.quantity;

  const canGoStep2 = cfg.profile.first_name && cfg.profile.last_name;
  const canGoStep3 = cfg.contactEmail && cfg.shipping.full_name && cfg.shipping.line1 && cfg.shipping.city && cfg.shipping.postal_code;

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await startCheckout({
        product_id: cfg.productId,
        quantity: cfg.quantity,
        profile: cfg.profile,
        shipping: cfg.shipping,
        contact_email: cfg.contactEmail,
        origin_url: window.location.origin,
      });
      window.location.href = res.checkout_url;
    } catch (e) {
      console.error(e);
      toast.error("Impossible de démarrer le paiement. Réessayez.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />
      <div className="pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="eyebrow">Configurateur</p>
          <h1 className="mt-2 font-display text-3xl lg:text-4xl font-bold tracking-tight">Créez votre carte en 3 étapes</h1>
          <div className="mt-6 flex items-center gap-2 text-xs">
            {[1, 2, 3].map((n) => (
              <div key={n} className={`flex items-center gap-2 ${n <= step ? "text-amber-400" : "text-slate-500"}`}>
                <span className={`w-6 h-6 rounded-full grid place-items-center border ${n <= step ? "border-amber-400 bg-amber-500/10" : "border-slate-700"}`}>{n < step ? <Check size={12} /> : n}</span>
                <span className="hidden sm:inline">{["Produit & design", "Vos infos", "Livraison & paiement"][n - 1]}</span>
                {n < 3 && <span className="w-6 sm:w-10 h-[1px] bg-slate-800 mx-1" />}
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_420px] gap-10">
          <div>
            {step === 1 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8" data-testid="step-1">
                <div>
                  <h2 className="font-display font-semibold text-xl mb-4">1. Choisissez votre produit</h2>
                  <div className="grid sm:grid-cols-3 gap-4">
                    {data.products.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => cfg.setProductId(p.id)}
                        data-testid={`product-${p.id}`}
                        className={`kt-card p-5 text-left transition ${cfg.productId === p.id ? "border-amber-400/60 ring-1 ring-amber-500/30" : ""}`}
                      >
                        <p className="font-display font-semibold">{p.name}</p>
                        <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{p.tagline}</p>
                        <p className="mt-3 text-amber-400 font-bold text-lg">{formatEUR(p.price_cents)}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="font-display font-semibold text-xl mb-4">2. Choisissez un template</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {data.templates.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => cfg.updateProfile({ template_id: t.id })}
                        data-testid={`template-${t.id}`}
                        className={`kt-card p-4 text-left transition ${cfg.profile.template_id === t.id ? "border-amber-400/60 ring-1 ring-amber-500/30" : ""}`}
                      >
                        <div className="h-16 rounded-md mb-2" style={{ background: t.bg, border: `1px solid ${t.accent}44` }}>
                          <div className="h-full grid place-items-center text-xs font-display font-bold" style={{ color: t.accent }}>Aa</div>
                        </div>
                        <p className="text-sm font-medium">{t.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => setStep(2)} className="kt-btn-gold" data-testid="next-step-2">Continuer <ArrowRight size={16} /></Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6" data-testid="step-2">
                <h2 className="font-display font-semibold text-xl">Vos informations professionnelles</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Prénom *" testid="input-first-name" value={cfg.profile.first_name} onChange={(v) => cfg.updateProfile({ first_name: v })} />
                  <Field label="Nom *" testid="input-last-name" value={cfg.profile.last_name} onChange={(v) => cfg.updateProfile({ last_name: v })} />
                  <Field label="Poste" testid="input-job-title" value={cfg.profile.job_title} onChange={(v) => cfg.updateProfile({ job_title: v })} />
                  <Field label="Entreprise" testid="input-company" value={cfg.profile.company} onChange={(v) => cfg.updateProfile({ company: v })} />
                  <Field label="Téléphone" testid="input-phone" value={cfg.profile.phone} onChange={(v) => cfg.updateProfile({ phone: v })} />
                  <Field label="Email professionnel" testid="input-email" type="email" value={cfg.profile.email} onChange={(v) => cfg.updateProfile({ email: v })} />
                </div>
                <div>
                  <h3 className="eyebrow mb-3">Vos réseaux (optionnel)</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="LinkedIn" testid="input-linkedin" value={cfg.profile.links.linkedin} onChange={(v) => cfg.updateLinks({ linkedin: v })} />
                    <Field label="Instagram" testid="input-instagram" value={cfg.profile.links.instagram} onChange={(v) => cfg.updateLinks({ instagram: v })} />
                    <Field label="Site web" testid="input-website" value={cfg.profile.links.website} onChange={(v) => cfg.updateLinks({ website: v })} />
                    <Field label="Calendly" testid="input-calendly" value={cfg.profile.links.calendly} onChange={(v) => cfg.updateLinks({ calendly: v })} />
                  </div>
                </div>
                <div className="flex justify-between">
                  <Button onClick={() => setStep(1)} variant="ghost" className="kt-btn-ghost" data-testid="prev-step-1">Retour</Button>
                  <Button onClick={() => canGoStep2 ? setStep(3) : toast.error("Prénom et nom requis")} className="kt-btn-gold" data-testid="next-step-3">Continuer <ArrowRight size={16} /></Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6" data-testid="step-3">
                <h2 className="font-display font-semibold text-xl">Livraison & paiement</h2>
                <Field label="Email de contact (confirmation) *" testid="input-contact-email" type="email" value={cfg.contactEmail} onChange={cfg.setContactEmail} />
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Nom complet *" testid="ship-name" value={cfg.shipping.full_name} onChange={(v) => cfg.updateShipping({ full_name: v })} />
                  <Field label="Adresse *" testid="ship-line1" value={cfg.shipping.line1} onChange={(v) => cfg.updateShipping({ line1: v })} />
                  <Field label="Complément d'adresse" testid="ship-line2" value={cfg.shipping.line2} onChange={(v) => cfg.updateShipping({ line2: v })} />
                  <Field label="Ville *" testid="ship-city" value={cfg.shipping.city} onChange={(v) => cfg.updateShipping({ city: v })} />
                  <Field label="Code postal *" testid="ship-postal" value={cfg.shipping.postal_code} onChange={(v) => cfg.updateShipping({ postal_code: v })} />
                  <Field label="Pays" testid="ship-country" value={cfg.shipping.country} onChange={(v) => cfg.updateShipping({ country: v })} />
                </div>
                <div className="kt-card p-5 bg-amber-500/5 border-amber-500/20">
                  <p className="text-sm text-slate-300">Paiement 100% sécurisé via Stripe. Vous serez redirigé vers la page de paiement Stripe pour finaliser votre commande.</p>
                </div>
                <div className="flex justify-between">
                  <Button onClick={() => setStep(2)} variant="ghost" className="kt-btn-ghost" data-testid="prev-step-2">Retour</Button>
                  <Button
                    onClick={() => canGoStep3 ? submit() : toast.error("Veuillez remplir les champs obligatoires")}
                    disabled={submitting}
                    className="kt-btn-gold"
                    data-testid="checkout-stripe-button"
                  >
                    {submitting ? <><Loader2 className="animate-spin" size={16} /> Redirection...</> : <>Payer {formatEUR(total)} <ArrowRight size={16} /></>}
                  </Button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Live preview */}
          <aside className="lg:sticky lg:top-24 h-fit" data-testid="live-preview">
            <div className="kt-card p-6">
              <p className="eyebrow mb-4">Aperçu en direct</p>
              <div className="flex justify-center py-6"><CardPreview profile={cfg.profile} size="md" /></div>
              <div className="mt-6 border-t border-white/5 pt-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-400">Produit</span><span className="font-medium">{product.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Quantité</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => cfg.setQuantity(Math.max(1, cfg.quantity - 1))} className="w-6 h-6 rounded border border-white/10 hover:border-amber-400/60" data-testid="qty-minus">−</button>
                    <span className="font-mono w-6 text-center" data-testid="qty-value">{cfg.quantity}</span>
                    <button onClick={() => cfg.setQuantity(Math.min(10, cfg.quantity + 1))} className="w-6 h-6 rounded border border-white/10 hover:border-amber-400/60" data-testid="qty-plus">+</button>
                  </div>
                </div>
                <div className="flex justify-between"><span className="text-slate-400">Livraison</span><span className="text-emerald-400">Offerte</span></div>
                <div className="flex justify-between border-t border-white/5 pt-3 mt-3">
                  <span className="text-slate-300 font-medium">Total</span>
                  <span className="font-display font-bold text-lg gold-text" data-testid="total-price">{formatEUR(total)}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
      <Footer />
    </div>
  );
}

const Field = ({ label, value, onChange, type = "text", testid }) => (
  <div>
    <Label className="text-xs text-slate-400 mb-1.5 block">{label}</Label>
    <Input
      type={type}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      data-testid={testid}
      className="bg-slate-900/60 border-white/10 focus:border-amber-400/60 focus:ring-amber-400/20 text-slate-100"
    />
  </div>
);
