import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowRight, Check, Loader2, Smartphone, CreditCard as CardIcon } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CardPreview from "@/components/CardPreview";
import ProfilePreview from "@/components/ProfilePreview";
import ThemeThumb from "@/components/ThemeThumb";
import DropZone from "@/components/DropZone";
import { useConfig } from "@/context/ConfigContext";
import { fetchProducts, startCheckout, formatEUR, uploadAvatarGuest } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function Configurator() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [data, setData] = useState(null);
  const [step, setStep] = useState(1);
  const [previewMode, setPreviewMode] = useState("profile"); // 'profile' | 'card'
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
          <h1 className="mt-2 font-display text-3xl lg:text-4xl font-bold tracking-tight">Créez votre page profil KalliTag</h1>
          <p className="mt-2 text-sm text-slate-400 max-w-2xl">La page web que vos contacts verront quand ils toucheront votre carte. Modifiable à vie depuis votre espace.</p>
          <div className="mt-6 flex items-center gap-2 text-xs">
            {[1, 2, 3].map((n) => (
              <div key={n} className={`flex items-center gap-2 ${n <= step ? "text-amber-400" : "text-slate-500"}`}>
                <span className={`w-6 h-6 rounded-full grid place-items-center border ${n <= step ? "border-amber-400 bg-amber-500/10" : "border-slate-700"}`}>{n < step ? <Check size={12} /> : n}</span>
                <span className="hidden sm:inline">{["Produit & finition", "Votre page profil", "Livraison & paiement"][n - 1]}</span>
                {n < 3 && <span className="w-6 sm:w-10 h-[1px] bg-slate-800 mx-1" />}
              </div>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_440px] gap-10">
          <div>
            {step === 1 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8" data-testid="step-1">
                <div>
                  <h2 className="font-display font-semibold text-xl mb-4">1. Choisissez votre support NFC</h2>
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
                  <h2 className="font-display font-semibold text-xl mb-1">2. Choisissez la finition physique</h2>
                  <p className="text-xs text-slate-400 mb-4">La carte est sobre — aucune inscription. La personnalisation se passe sur la page profil.</p>
                  <div className="grid sm:grid-cols-3 gap-4">
                    {data.finishes.map((f) => {
                      const active = cfg.profile.finish_id === f.id;
                      return (
                        <button
                          key={f.id}
                          onClick={() => { cfg.updateProfile({ finish_id: f.id }); setPreviewMode("card"); }}
                          data-testid={`finish-${f.id}`}
                          className={`kt-card p-4 text-left transition ${active ? "border-amber-400/60 ring-1 ring-amber-500/30" : ""}`}
                        >
                          <div className="flex justify-center py-2">
                            <CardPreview finishId={f.id} size="sm" tilt showLabel={false} />
                          </div>
                          <div className="mt-3">
                            <p className="text-sm font-semibold">{f.name}</p>
                            <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{f.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h2 className="font-display font-semibold text-xl mb-1">3. Thème de votre page profil</h2>
                  <p className="text-xs text-slate-400 mb-4">Vous pourrez le modifier à tout moment depuis votre espace.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {data.themes.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => { cfg.updateProfile({ theme_id: t.id }); setPreviewMode("profile"); }}
                        data-testid={`theme-${t.id}`}
                        className="text-left"
                      >
                        <ThemeThumb themeId={t.id} label={t.name} active={cfg.profile.theme_id === t.id} />
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
                <div>
                  <h2 className="font-display font-semibold text-xl">Vos informations</h2>
                  <p className="text-xs text-slate-400 mt-1">{
                    product.kind === "reviews" ? "Où envoyer les clients qui tapent votre plaque." :
                    product.kind === "pet" ? "Infos sur votre animal et vos coordonnées si perdu." :
                    "Ces infos apparaissent sur votre page profil. Modifiables à vie."
                  }</p>
                </div>

                {product.kind === "reviews" && (
                  <>
                    <Field label="Nom de l'établissement *" testid="input-business-name" value={cfg.profile.business_name} onChange={(v) => cfg.updateProfile({ business_name: v })} />
                    <Field label="URL de vos avis Google *" testid="input-reviews-url" value={cfg.profile.reviews_url} onChange={(v) => cfg.updateProfile({ reviews_url: v })} placeholder="https://g.page/r/..." />
                    <Field label="Message d'accueil (optionnel)" testid="input-reviews-message" value={cfg.profile.reviews_message} onChange={(v) => cfg.updateProfile({ reviews_message: v })} placeholder="Merci pour votre visite, un avis nous ferait plaisir !" />
                  </>
                )}

                {product.kind === "pet" && (
                  <>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Field label="Nom de l'animal *" testid="input-pet-name" value={cfg.profile.pet_name} onChange={(v) => cfg.updateProfile({ pet_name: v })} />
                      <Field label="Espèce" testid="input-pet-species" value={cfg.profile.pet_species} onChange={(v) => cfg.updateProfile({ pet_species: v })} placeholder="Chien, Chat…" />
                      <Field label="Race" testid="input-pet-breed" value={cfg.profile.pet_breed} onChange={(v) => cfg.updateProfile({ pet_breed: v })} />
                      <Field label="Sexe" testid="input-pet-sex" value={cfg.profile.pet_sex} onChange={(v) => cfg.updateProfile({ pet_sex: v })} placeholder="Mâle / Femelle" />
                      <Field label="Date de naissance" testid="input-pet-birthdate" value={cfg.profile.pet_birthdate} onChange={(v) => cfg.updateProfile({ pet_birthdate: v })} placeholder="JJ/MM/AAAA" />
                      <Field label="N° de puce" testid="input-pet-chip" value={cfg.profile.chip_number} onChange={(v) => cfg.updateProfile({ chip_number: v })} />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-400 mb-2 block">Photo de l'animal (optionnel)</Label>
                      <DropZone value={cfg.profile.avatar_url} testid="cfg-avatar-drop"
                        onUpload={async (file) => { const res = await uploadAvatarGuest(file); const url = res.url.startsWith("http") ? res.url : `${process.env.REACT_APP_BACKEND_URL}${res.url}`; cfg.updateProfile({ avatar_url: url }); }}
                        onClear={() => cfg.updateProfile({ avatar_url: "" })} />
                    </div>
                    <div className="border-t border-white/5 pt-4">
                      <p className="eyebrow mb-3">Vos coordonnées (propriétaire)</p>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="Nom propriétaire *" testid="input-owner-name" value={cfg.profile.owner_name} onChange={(v) => cfg.updateProfile({ owner_name: v })} />
                        <Field label="Téléphone *" testid="input-owner-phone" value={cfg.profile.owner_phone} onChange={(v) => cfg.updateProfile({ owner_phone: v })} />
                        <Field label="Email" testid="input-owner-email" type="email" value={cfg.profile.owner_email} onChange={(v) => cfg.updateProfile({ owner_email: v })} />
                        <Field label="Vétérinaire" testid="input-vet" value={cfg.profile.vet_contact} onChange={(v) => cfg.updateProfile({ vet_contact: v })} />
                      </div>
                      <div className="mt-4">
                        <Label className="text-xs text-slate-400 mb-1.5 block">Notes médicales (allergies, traitement…)</Label>
                        <textarea value={cfg.profile.medical_notes || ""} onChange={(e) => cfg.updateProfile({ medical_notes: e.target.value })} rows={2}
                                  data-testid="input-medical-notes"
                                  className="w-full px-3 py-2 rounded-md bg-slate-900/60 border border-white/10 text-slate-100 text-sm" />
                      </div>
                      <div className="mt-4">
                        <Label className="text-xs text-slate-400 mb-1.5 block">Message si perdu(e)</Label>
                        <textarea value={cfg.profile.lost_message || ""} onChange={(e) => cfg.updateProfile({ lost_message: e.target.value })} rows={2}
                                  data-testid="input-lost-message"
                                  placeholder="Si vous m'avez trouvé, merci d'appeler mon humain. Récompense !"
                                  className="w-full px-3 py-2 rounded-md bg-slate-900/60 border border-white/10 text-slate-100 text-sm" />
                      </div>
                    </div>
                  </>
                )}

                {product.kind === "profile" && (
                  <>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Field label="Prénom *" testid="input-first-name" value={cfg.profile.first_name} onChange={(v) => cfg.updateProfile({ first_name: v })} />
                      <Field label="Nom *" testid="input-last-name" value={cfg.profile.last_name} onChange={(v) => cfg.updateProfile({ last_name: v })} />
                      <Field label="Poste" testid="input-job-title" value={cfg.profile.job_title} onChange={(v) => cfg.updateProfile({ job_title: v })} />
                      <Field label="Entreprise" testid="input-company" value={cfg.profile.company} onChange={(v) => cfg.updateProfile({ company: v })} />
                      <Field label="Téléphone" testid="input-phone" value={cfg.profile.phone} onChange={(v) => cfg.updateProfile({ phone: v })} />
                      <Field label="Email professionnel" testid="input-email" type="email" value={cfg.profile.email} onChange={(v) => cfg.updateProfile({ email: v })} />
                    </div>
                    <Field label="Phrase d'accroche (optionnel)" testid="input-tagline" value={cfg.profile.tagline} onChange={(v) => cfg.updateProfile({ tagline: v })} placeholder="Ex : Aide les indépendants à décrocher plus de clients." />

                    <div>
                      <Label className="text-xs text-slate-400 mb-2 block">Photo de profil (optionnel)</Label>
                      <DropZone
                        value={cfg.profile.avatar_url}
                        testid="cfg-avatar-drop"
                        onUpload={async (file) => {
                          const res = await uploadAvatarGuest(file);
                          const url = res.url.startsWith("http") ? res.url : `${process.env.REACT_APP_BACKEND_URL}${res.url}`;
                          cfg.updateProfile({ avatar_url: url });
                        }}
                        onClear={() => cfg.updateProfile({ avatar_url: "" })}
                      />
                    </div>

                    <div>
                      <h3 className="eyebrow mb-3">Boutons d'action rapide</h3>
                      <p className="text-xs text-slate-500 mb-3">Chaque lien devient un bouton sur votre page — vos contacts vous joignent en 1 tap.</p>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="LinkedIn" testid="input-linkedin" value={cfg.profile.links.linkedin} onChange={(v) => cfg.updateLinks({ linkedin: v })} placeholder="https://linkedin.com/in/..." />
                        <Field label="Instagram" testid="input-instagram" value={cfg.profile.links.instagram} onChange={(v) => cfg.updateLinks({ instagram: v })} placeholder="https://instagram.com/..." />
                        <Field label="WhatsApp" testid="input-whatsapp" value={cfg.profile.links.whatsapp} onChange={(v) => cfg.updateLinks({ whatsapp: v })} placeholder="https://wa.me/33..." />
                        <Field label="Site web" testid="input-website" value={cfg.profile.links.website} onChange={(v) => cfg.updateLinks({ website: v })} placeholder="https://..." />
                        <Field label="Calendly" testid="input-calendly" value={cfg.profile.links.calendly} onChange={(v) => cfg.updateLinks({ calendly: v })} placeholder="https://calendly.com/..." />
                        <Field label="TikTok" testid="input-tiktok" value={cfg.profile.links.tiktok} onChange={(v) => cfg.updateLinks({ tiktok: v })} placeholder="https://tiktok.com/@..." />
                        <Field label="YouTube" testid="input-youtube" value={cfg.profile.links.youtube} onChange={(v) => cfg.updateLinks({ youtube: v })} placeholder="https://youtube.com/@..." />
                      </div>
                    </div>
                  </>
                )}

                <div className="flex justify-between">
                  <Button onClick={() => setStep(1)} variant="ghost" className="kt-btn-ghost" data-testid="prev-step-1">Retour</Button>
                  <Button onClick={() => {
                    const ok = product.kind === "reviews" ? (cfg.profile.business_name && cfg.profile.reviews_url)
                             : product.kind === "pet" ? (cfg.profile.pet_name && cfg.profile.owner_name && cfg.profile.owner_phone)
                             : (cfg.profile.first_name && cfg.profile.last_name);
                    ok ? setStep(3) : toast.error("Merci de remplir les champs obligatoires (*)");
                  }} className="kt-btn-gold" data-testid="next-step-3">Continuer <ArrowRight size={16} /></Button>
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

          {/* LIVE PREVIEW — split between profile (star) and physical card */}
          <aside className="lg:sticky lg:top-24 h-fit" data-testid="live-preview">
            <div className="kt-card p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="eyebrow">Aperçu en direct</p>
                <div className="inline-flex rounded-full border border-white/10 p-0.5 text-xs">
                  <button
                    onClick={() => setPreviewMode("profile")}
                    data-testid="preview-mode-profile"
                    className={`px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 transition ${previewMode === "profile" ? "bg-amber-500/20 text-amber-300" : "text-slate-400 hover:text-slate-200"}`}
                  >
                    <Smartphone size={13} /> Profil
                  </button>
                  <button
                    onClick={() => setPreviewMode("card")}
                    data-testid="preview-mode-card"
                    className={`px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 transition ${previewMode === "card" ? "bg-amber-500/20 text-amber-300" : "text-slate-400 hover:text-slate-200"}`}
                  >
                    <CardIcon size={13} /> Carte
                  </button>
                </div>
              </div>

              <div className="flex justify-center py-4">
                {previewMode === "profile"
                  ? <ProfilePreview profile={cfg.profile} onAction={(k) => k === "vcard" && toast.info("Aperçu — vos contacts pourront télécharger la vCard depuis leur téléphone.")} />
                  : <div className="pt-8"><CardPreview finishId={cfg.profile.finish_id} size="md" /></div>
                }
              </div>

              <div className="mt-4 border-t border-white/5 pt-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-400">Support NFC</span><span className="font-medium">{product.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Finition</span><span className="font-medium">{data.finishes.find(f => f.id === cfg.profile.finish_id)?.name}</span></div>
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

const Field = ({ label, value, onChange, type = "text", testid, placeholder }) => (
  <div>
    <Label className="text-xs text-slate-400 mb-1.5 block">{label}</Label>
    <Input
      type={type}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      data-testid={testid}
      className="bg-slate-900/60 border-white/10 focus:border-amber-400/60 focus:ring-amber-400/20 text-slate-100"
    />
  </div>
);
