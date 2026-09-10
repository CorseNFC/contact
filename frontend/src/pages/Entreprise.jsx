import { useEffect, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Plus, Trash2, ArrowRight, Loader2, Building2, Percent } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { bulkPricing, bulkCheckout, formatEUR } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const emptyCard = () => ({ first_name: "", last_name: "", job_title: "", phone: "", email: "", finish_id: "noir_mat", theme_id: "onyx" });

export default function Entreprise() {
  const [pricing, setPricing] = useState(null);
  const [company, setCompany] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [shipping, setShipping] = useState({ full_name: "", line1: "", line2: "", city: "", postal_code: "", country: "FR" });
  const [cards, setCards] = useState([emptyCard(), emptyCard(), emptyCard(), emptyCard(), emptyCard()]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { bulkPricing().then(setPricing).catch(() => {}); }, []);

  const qty = cards.length;
  const currentTier = pricing?.tiers?.find((t) => qty >= t.min);
  const pct = currentTier?.pct || 0;
  const base = pricing?.base_price_cents || 3990;
  const unit = Math.round(base * (100 - pct) / 100);
  const total = unit * qty;

  const nextTier = pricing?.tiers ? [...pricing.tiers].reverse().find((t) => qty < t.min) : null;

  const setCard = (i, patch) => setCards((cs) => cs.map((c, k) => k === i ? { ...c, ...patch } : c));
  const removeCard = (i) => setCards((cs) => cs.filter((_, k) => k !== i));
  const addCard = () => setCards((cs) => [...cs, emptyCard()]);

  const submit = async () => {
    if (submitting) return;
    if (!company.trim()) return toast.error("Nom de l'entreprise requis");
    if (!contactEmail.trim()) return toast.error("Email de contact requis");
    if (!shipping.full_name || !shipping.line1 || !shipping.city || !shipping.postal_code) return toast.error("Adresse de livraison incomplète");
    const invalid = cards.findIndex((c) => !c.first_name || !c.last_name);
    if (invalid >= 0) return toast.error(`Carte ${invalid + 1} : prénom + nom requis`);
    setSubmitting(true);
    try {
      const r = await bulkCheckout({
        company_name: company, cards, shipping, contact_email: contactEmail, origin_url: window.location.origin,
      });
      window.location.href = r.checkout_url;
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#1F1B16]">
      <Navbar />
      <div className="pt-24 pb-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 grid place-items-center"><Building2 className="text-amber-400" size={20} /></div>
          <p className="eyebrow">Offre Entreprise</p>
        </div>
        <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight">Équipez toute votre équipe</h1>
        <p className="mt-3 text-[#6B5F4E] max-w-2xl">Une commande, plusieurs cartes personnalisées, une seule facture. Plus vous commandez, plus la remise augmente.</p>

        {/* Tiers */}
        {pricing && (
          <div className="grid sm:grid-cols-4 gap-3 mt-8" data-testid="bulk-tiers">
            {[...pricing.tiers].reverse().map((t) => (
              <div key={t.min} className={`kt-card p-4 text-center transition ${qty >= t.min ? "border-amber-400/60 ring-1 ring-amber-500/30" : "opacity-70"}`} data-testid={`tier-${t.min}`}>
                <p className="text-xs text-[#8B7F6E]">À partir de</p>
                <p className="font-display font-bold text-2xl">{t.min} <span className="text-sm font-normal text-[#6B5F4E]">cartes</span></p>
                <p className="mt-1 text-amber-400 font-semibold inline-flex items-center gap-1"><Percent size={12} /> −{t.pct}%</p>
              </div>
            ))}
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_360px] gap-10 mt-10">
          <div className="space-y-6">
            <div className="kt-card p-6 space-y-4">
              <p className="eyebrow">Votre entreprise</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Nom de l'entreprise *" testid="input-company" value={company} onChange={setCompany} />
                <Field label="Email de contact *" testid="input-contact-email" type="email" value={contactEmail} onChange={setContactEmail} />
              </div>
              <p className="eyebrow mt-2">Adresse de livraison</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Nom du destinataire *" testid="ship-name" value={shipping.full_name} onChange={(v) => setShipping({ ...shipping, full_name: v })} />
                <Field label="Adresse *" testid="ship-line1" value={shipping.line1} onChange={(v) => setShipping({ ...shipping, line1: v })} />
                <Field label="Ville *" testid="ship-city" value={shipping.city} onChange={(v) => setShipping({ ...shipping, city: v })} />
                <Field label="Code postal *" testid="ship-postal" value={shipping.postal_code} onChange={(v) => setShipping({ ...shipping, postal_code: v })} />
              </div>
            </div>

            <div className="kt-card p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="eyebrow">Cartes à personnaliser · <span className="text-amber-400">{qty}</span></p>
                <button onClick={addCard} className="kt-btn-ghost text-xs inline-flex items-center gap-1.5" data-testid="btn-add-card">
                  <Plus size={13} /> Ajouter une carte
                </button>
              </div>
              <div className="space-y-3">
                {cards.map((c, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-[#1F1B16]/8 bg-white/60 p-4" data-testid={`card-row-${i}`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-[#8B7F6E]">Carte #{i + 1}</p>
                      {cards.length > 1 && (
                        <button onClick={() => removeCard(i)} className="text-[#8B7F6E] hover:text-red-400" data-testid={`remove-card-${i}`}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      <MiniField placeholder="Prénom *" testid={`c${i}-first`} value={c.first_name} onChange={(v) => setCard(i, { first_name: v })} />
                      <MiniField placeholder="Nom *" testid={`c${i}-last`} value={c.last_name} onChange={(v) => setCard(i, { last_name: v })} />
                      <MiniField placeholder="Poste" testid={`c${i}-title`} value={c.job_title} onChange={(v) => setCard(i, { job_title: v })} />
                      <MiniField placeholder="Téléphone" testid={`c${i}-phone`} value={c.phone} onChange={(v) => setCard(i, { phone: v })} />
                      <MiniField placeholder="Email pro" testid={`c${i}-email`} type="email" value={c.email} onChange={(v) => setCard(i, { email: v })} />
                      <select value={c.finish_id} onChange={(e) => setCard(i, { finish_id: e.target.value })} data-testid={`c${i}-finish`} className="px-3 py-2 rounded-md bg-white/70 border border-[#1F1B16]/10 text-[#1F1B16] text-sm">
                        <option value="noir_mat">Noir mat</option>
                        <option value="metal_brosse">Métal brossé</option>
                        <option value="or_brosse">Or brossé</option>
                      </select>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Sticky pricing */}
          <aside className="lg:sticky lg:top-24 h-fit">
            <div className="kt-card p-6" data-testid="bulk-summary">
              <p className="eyebrow">Récapitulatif</p>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-[#6B5F4E]">Cartes</span><span className="font-medium">{qty}</span></div>
                <div className="flex justify-between"><span className="text-[#6B5F4E]">Prix unitaire</span>
                  <span>{pct > 0 && <span className="text-[#8B7F6E] line-through mr-1 text-xs">{formatEUR(base)}</span>}<span className="font-medium">{formatEUR(unit)}</span></span>
                </div>
                {pct > 0 && (
                  <div className="flex justify-between text-emerald-400"><span>Remise volume</span><span data-testid="discount-line">−{pct}%</span></div>
                )}
                <div className="flex justify-between"><span className="text-[#6B5F4E]">Livraison</span><span className="text-emerald-400">Offerte</span></div>
                <div className="flex justify-between border-t border-[#1F1B16]/8 pt-3 mt-3">
                  <span className="text-[#4A3F2E] font-medium">Total</span>
                  <span className="font-display font-bold text-2xl gold-text" data-testid="bulk-total">{formatEUR(total)}</span>
                </div>
                {nextTier && (
                  <p className="text-[11px] text-[#8B7F6E] mt-2">
                    Ajoutez encore <span className="text-amber-400 font-medium">{nextTier.min - qty} carte{nextTier.min - qty > 1 ? "s" : ""}</span> pour passer à −{nextTier.pct}%
                  </p>
                )}
              </div>
              <button onClick={submit} disabled={submitting} className="kt-btn-gold w-full justify-center mt-6" data-testid="bulk-checkout-submit">
                {submitting ? <><Loader2 className="animate-spin" size={16} /> Redirection…</> : <>Payer {formatEUR(total)} <ArrowRight size={16} /></>}
              </button>
              <p className="mt-3 text-[10px] text-[#8B7F6E] text-center">Facture PDF envoyée après paiement · Stripe sécurisé</p>
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
    <Label className="text-xs text-[#6B5F4E] mb-1.5 block">{label}</Label>
    <Input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} data-testid={testid}
      className="bg-white/70 border-[#1F1B16]/10 focus:border-amber-400/60 text-[#1F1B16]" />
  </div>
);
const MiniField = ({ placeholder, value, onChange, type = "text", testid }) => (
  <Input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} data-testid={testid}
    className="bg-white/70 border-[#1F1B16]/10 focus:border-amber-400/60 text-[#1F1B16] text-sm" />
);
