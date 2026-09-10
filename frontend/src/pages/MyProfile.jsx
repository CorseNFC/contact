import { useEffect, useState, useRef } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Save, LogOut, Download, ExternalLink, BarChart3, Copy, Check, Sparkles, Crown, RefreshCw, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProfilePreview from "@/components/ProfilePreview";
import DropZone from "@/components/DropZone";
import { useAuth } from "@/context/AuthContext";
import { updateProfile, uploadAvatar, getAnalytics, qrUrl, publicProfileUrl, API, getMyPro, proCheckout, proPortal, releaseCard, listLeads, leadsCsvUrl, listVariants, addVariant, deleteVariant, activateVariant } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const themes = [
  { id: "onyx", name: "Onyx" }, { id: "ivory", name: "Ivoire" },
  { id: "midnight", name: "Midnight" }, { id: "rose", name: "Rose Nude" },
];

export default function MyProfile() {
  const auth = useAuth();
  const [activeSlug, setActiveSlug] = useState(null);
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [pro, setPro] = useState({ active: false });
  const [transferCode, setTransferCode] = useState(null);
  const [leadsData, setLeadsData] = useState(null);
  const [variants, setVariants] = useState([]);
  const [params] = useSearchParams();

  // Auto-trigger Pro upgrade if ?upgrade=monthly|yearly
  useEffect(() => {
    const up = params.get("upgrade");
    if (up === "monthly" || up === "yearly") {
      proCheckout(up, window.location.origin).then((r) => { window.location.href = r.checkout_url; }).catch(() => {});
    }
    if (params.get("pro") === "success") toast.success("Bienvenue chez KalliTag Pro !");
  }, [params]);

  const orders = (auth.user?.orders || []).filter((o) => o.payment_status === "paid");

  useEffect(() => {
    if (!activeSlug && orders.length) {
      setActiveSlug(orders[0].profile_slug);
      setProfile(orders[0].profile);
    }
  }, [orders, activeSlug]);

  useEffect(() => {
    if (!activeSlug) return;
    const o = orders.find((x) => x.profile_slug === activeSlug);
    if (o) setProfile(o.profile);
    getAnalytics(activeSlug).then(setAnalytics).catch(() => setAnalytics(null));
    listLeads(activeSlug).then(setLeadsData).catch(() => setLeadsData(null));
    listVariants(activeSlug).then((r) => setVariants(r.variants || [])).catch(() => setVariants([]));
  }, [activeSlug]); // eslint-disable-line

  useEffect(() => { getMyPro().then(setPro).catch(() => {}); }, []);

  const upgrade = async (plan) => {
    try {
      const r = await proCheckout(plan, window.location.origin);
      window.location.href = r.checkout_url;
    } catch { toast.error("Erreur — réessayez"); }
  };

  const openPortal = async () => {
    try {
      const r = await proPortal(window.location.href);
      window.location.href = r.url;
    } catch { toast.error("Portail indisponible"); }
  };

  const doRelease = async () => {
    if (!window.confirm("Céder cette carte à un nouveau propriétaire ? Vos infos seront effacées et il pourra la reprendre avec le code fourni.")) return;
    try {
      const r = await releaseCard(activeSlug);
      setTransferCode(r.transfer_code);
      await auth.refresh();
      toast.success("Carte libérée — partagez le code au nouveau propriétaire.");
    } catch { toast.error("Impossible de libérer cette carte"); }
  };

  if (auth.loading) return <div className="min-h-screen grid place-items-center bg-[#FAF7F0]"><Loader2 className="animate-spin text-amber-400" /></div>;
  if (!auth.user) return <Navigate to="/connexion" replace />;
  if (!orders.length) {
    return (
      <div className="min-h-screen bg-[#FAF7F0] text-[#1F1B16]">
        <Navbar />
        <div className="pt-32 pb-24 max-w-2xl mx-auto px-4 text-center">
          <p className="eyebrow">Espace client</p>
          <h1 className="mt-2 font-display text-3xl font-bold">Aucune commande active</h1>
          <p className="mt-3 text-[#6B5F4E]">Nous n'avons pas trouvé de commande payée pour <span className="text-amber-400">{auth.user.email}</span>. Passez commande pour créer votre profil.</p>
          <Link to="/configurateur" className="mt-6 inline-flex kt-btn-gold">Commander ma carte</Link>
          <button onClick={auth.logout} className="mt-4 block mx-auto text-xs text-[#8B7F6E] hover:text-[#4A3F2E]">Se déconnecter</button>
        </div>
        <Footer />
      </div>
    );
  }

  const updateField = (patch) => setProfile((p) => ({ ...p, ...patch }));
  const updateLink = (patch) => setProfile((p) => ({ ...p, links: { ...(p.links || {}), ...patch } }));

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await updateProfile(activeSlug, profile);
      await auth.refresh();
      toast.success("Profil enregistré");
    } catch (e) {
      toast.error("Erreur lors de l'enregistrement");
    } finally { setSaving(false); }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(publicProfileUrl(activeSlug));
    setCopied(true); setTimeout(() => setCopied(false), 1600);
  };

  const publicUrl = publicProfileUrl(activeSlug);
  const qr = qrUrl(activeSlug);

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#1F1B16]">
      <Navbar />
      <div className="pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <p className="eyebrow">Espace client</p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight">Mon profil KalliTag</h1>
              {pro.active && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 border border-amber-400/50 bg-amber-500/10 rounded-full px-3 py-1" data-testid="pro-badge">
                  <Crown size={12} /> Pro
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-[#6B5F4E]">Connecté en tant que <span className="text-amber-400">{auth.user.email}</span></p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {pro.active ? (
              <button onClick={openPortal} className="kt-btn-ghost text-xs inline-flex items-center gap-2" data-testid="btn-portal">Gérer l'abonnement</button>
            ) : (
              <button onClick={() => upgrade("monthly")} className="kt-btn-gold text-xs inline-flex items-center gap-2" data-testid="btn-upgrade">
                <Sparkles size={13} /> Passer Pro
              </button>
            )}
            <button onClick={auth.logout} className="kt-btn-ghost text-xs inline-flex items-center gap-2" data-testid="btn-logout">
              <LogOut size={14} /> Se déconnecter
            </button>
          </div>
        </div>

        {!pro.active && (
          <div className="kt-card p-5 mb-6 border-amber-500/30 bg-amber-500/5 flex items-start justify-between gap-4 flex-wrap" data-testid="pro-banner">
            <div>
              <p className="eyebrow flex items-center gap-1.5"><Crown size={12} /> KalliTag Pro</p>
              <p className="mt-1 text-sm text-slate-200"><strong>Débloquez</strong> capture leads illimitée, géoloc scans, export CSV et multi-profils.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => upgrade("monthly")} className="kt-btn-gold text-sm" data-testid="pro-upgrade-monthly">4,99 € /mois</button>
              <button onClick={() => upgrade("yearly")} className="kt-btn-ghost text-sm" data-testid="pro-upgrade-yearly">39 € /an</button>
            </div>
          </div>
        )}

        {transferCode && (
          <div className="kt-card p-6 mb-6 border-emerald-500/40 bg-emerald-500/5" data-testid="transfer-code-box">
            <p className="eyebrow text-emerald-400">Code de transfert généré</p>
            <p className="mt-2 text-sm text-[#4A3F2E]">Partagez ce code au nouveau propriétaire. Il pourra reprendre la carte sur <span className="font-mono text-amber-300">/reclaim</span>.</p>
            <p className="mt-4 font-mono text-3xl font-bold tracking-[0.3em] text-emerald-300 text-center">{transferCode}</p>
          </div>
        )}

        {orders.length > 1 && (
          <div className="mb-6 flex gap-2 flex-wrap">
            {orders.map((o) => (
              <button
                key={o.profile_slug}
                onClick={() => setActiveSlug(o.profile_slug)}
                data-testid={`profile-tab-${o.profile_slug}`}
                className={`px-4 py-2 rounded-full text-xs font-medium border transition ${activeSlug === o.profile_slug ? "border-amber-400 bg-amber-500/10 text-amber-300" : "border-[#1F1B16]/10 text-[#6B5F4E] hover:text-white"}`}
              >
                {o.profile.first_name} {o.profile.last_name}
              </button>
            ))}
          </div>
        )}

        {profile && (
          <div className="grid lg:grid-cols-[1fr_420px] gap-10">
            <div className="space-y-8">
              {/* Public link + QR */}
              <div className="kt-card p-6" data-testid="section-links">
                <p className="eyebrow mb-3">Votre lien public</p>
                <div className="flex items-center gap-2 rounded-lg border border-[#1F1B16]/10 bg-white/70 px-3 py-2 text-sm">
                  <span className="font-mono truncate text-amber-300 flex-1" data-testid="public-url">{publicUrl}</span>
                  <button onClick={copyLink} className="text-[#6B5F4E] hover:text-white" data-testid="copy-url">
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                  <a href={publicUrl} target="_blank" rel="noreferrer" className="text-[#6B5F4E] hover:text-white" data-testid="open-url"><ExternalLink size={14} /></a>
                </div>
                <div className="mt-5 grid sm:grid-cols-[auto_1fr] gap-5 items-start">
                  <div className="p-3 bg-white rounded-xl inline-block">
                    <img src={qr} alt="QR" width={140} height={140} data-testid="qr-image" />
                  </div>
                  <div>
                    <p className="text-sm text-[#4A3F2E]">QR code sticker</p>
                    <p className="text-xs text-[#8B7F6E] mt-1 leading-relaxed">Téléchargez-le pour l'imprimer sur un flyer, une devanture, ou l'ajouter à votre signature email — pointe vers votre profil.</p>
                    <a href={qr} download={`kallitag-${activeSlug}.png`} className="kt-btn-ghost inline-flex items-center gap-2 mt-3 text-xs" data-testid="btn-qr-download">
                      <Download size={14} /> Télécharger le QR
                    </a>
                  </div>
                </div>
              </div>

              {/* Analytics */}
              <div className="kt-card p-6" data-testid="section-analytics">
                <div className="flex items-center justify-between mb-3">
                  <p className="eyebrow flex items-center gap-2"><BarChart3 size={14} /> Analytics scans</p>
                  <span className="text-[10px] text-amber-400 border border-amber-500/40 rounded-full px-2 py-0.5">Aperçu Pro</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Stat label="Scans totaux" value={analytics?.total ?? 0} testid="stat-total" />
                  <Stat label="7 derniers jours" value={analytics?.last_7_days ?? 0} testid="stat-last7" />
                </div>
                {analytics?.by_hour && (
                  <div className="mt-5">
                    <p className="text-xs text-[#6B5F4E] mb-2">Répartition horaire</p>
                    <div className="flex items-end gap-0.5 h-20">
                      {analytics.by_hour.map((v, i) => {
                        const max = Math.max(1, ...analytics.by_hour);
                        return (
                          <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-amber-500/30 to-amber-400" style={{ height: `${(v / max) * 100}%`, minHeight: v ? 4 : 2, opacity: v ? 1 : 0.15 }} title={`${i}h : ${v}`} />
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-[10px] text-[#8B7F6E] mt-1"><span>00h</span><span>12h</span><span>23h</span></div>
                  </div>
                )}
                <p className="mt-4 text-[11px] text-[#8B7F6E]">Analytics avancés (géolocalisation, capture de leads) débloqués avec <span className="text-amber-400">KalliTag Pro</span> — bientôt disponible.</p>
              </div>

              {/* Editor */}
              <div className="kt-card p-6 space-y-5" data-testid="section-editor">
                <p className="eyebrow">Personnaliser mon profil</p>

                <div>
                  <Label className="text-xs text-[#6B5F4E] mb-2 block">Photo de profil</Label>
                  <DropZone
                    value={profile.avatar_url}
                    testid="dash-avatar-drop"
                    onUpload={async (file) => {
                      const res = await uploadAvatar(file);
                      const url = res.url.startsWith("http") ? res.url : `${process.env.REACT_APP_BACKEND_URL}${res.url}`;
                      updateField({ avatar_url: url });
                    }}
                    onClear={() => updateField({ avatar_url: "" })}
                    hint="Glissez-déposez ou cliquez · JPEG, PNG, WebP · 5 Mo max · pensez à enregistrer"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Prénom" testid="edit-first-name" value={profile.first_name} onChange={(v) => updateField({ first_name: v })} />
                  <Field label="Nom" testid="edit-last-name" value={profile.last_name} onChange={(v) => updateField({ last_name: v })} />
                  <Field label="Poste" testid="edit-job-title" value={profile.job_title} onChange={(v) => updateField({ job_title: v })} />
                  <Field label="Entreprise" testid="edit-company" value={profile.company} onChange={(v) => updateField({ company: v })} />
                  <Field label="Téléphone" testid="edit-phone" value={profile.phone} onChange={(v) => updateField({ phone: v })} />
                  <Field label="Email affiché" testid="edit-email" type="email" value={profile.email} onChange={(v) => updateField({ email: v })} />
                </div>
                <Field label="Phrase d'accroche" testid="edit-tagline" value={profile.tagline} onChange={(v) => updateField({ tagline: v })} />

                <div>
                  <Label className="text-xs text-[#6B5F4E] mb-2 block">Thème</Label>
                  <div className="flex gap-2 flex-wrap">
                    {themes.map((t) => (
                      <button key={t.id} onClick={() => updateField({ theme_id: t.id })} data-testid={`edit-theme-${t.id}`}
                        className={`px-3 py-1.5 rounded-full text-xs border ${profile.theme_id === t.id ? "border-amber-400 bg-amber-500/10 text-amber-300" : "border-[#1F1B16]/10 text-[#6B5F4E] hover:text-white"}`}>{t.name}</button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-[#1F1B16]/8 pt-5">
                  <p className="eyebrow mb-3">Boutons d'action rapide</p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="LinkedIn" testid="edit-linkedin" value={profile.links?.linkedin} onChange={(v) => updateLink({ linkedin: v })} />
                    <Field label="Instagram" testid="edit-instagram" value={profile.links?.instagram} onChange={(v) => updateLink({ instagram: v })} />
                    <Field label="WhatsApp" testid="edit-whatsapp" value={profile.links?.whatsapp} onChange={(v) => updateLink({ whatsapp: v })} />
                    <Field label="Site web" testid="edit-website" value={profile.links?.website} onChange={(v) => updateLink({ website: v })} />
                    <Field label="Calendly" testid="edit-calendly" value={profile.links?.calendly} onChange={(v) => updateLink({ calendly: v })} />
                    <Field label="TikTok" testid="edit-tiktok" value={profile.links?.tiktok} onChange={(v) => updateLink({ tiktok: v })} />
                    <Field label="YouTube" testid="edit-youtube" value={profile.links?.youtube} onChange={(v) => updateLink({ youtube: v })} />
                  </div>
                </div>

                <button onClick={save} disabled={saving} className="kt-btn-gold w-full sm:w-auto justify-center" data-testid="btn-save-profile">
                  {saving ? <><Loader2 className="animate-spin" size={16} /> Enregistrement...</> : <><Save size={16} /> Enregistrer</>}
                </button>
              </div>

              {/* Leads */}
              <div className="kt-card p-6" data-testid="section-leads">
                <div className="flex items-center justify-between mb-3">
                  <p className="eyebrow flex items-center gap-2"><Users size={14} /> Leads captés</p>
                  {pro.active && leadsData && leadsData.total > 0 && (
                    <a href={leadsCsvUrl(activeSlug)} className="text-xs text-amber-400 hover:text-amber-200 inline-flex items-center gap-1" data-testid="leads-export">
                      <Download size={12} /> Export CSV
                    </a>
                  )}
                </div>
                {leadsData?.total > 0 ? (
                  <>
                    <p className="text-xs text-[#6B5F4E] mb-3">{leadsData.total} contact{leadsData.total > 1 ? "s" : ""} au total{!pro.active && ` — les 3 plus récents visibles`}</p>
                    <div className="space-y-2">
                      {(leadsData.leads || []).map((l, i) => (
                        <div key={i} className="rounded-lg border border-[#1F1B16]/8 bg-white/60 p-3 text-sm">
                          <div className="flex justify-between text-xs text-[#8B7F6E]"><span>{new Date(l.created_at).toLocaleString("fr-FR")}</span></div>
                          <p className="mt-1 font-medium text-[#1F1B16]">{l.name}</p>
                          <p className="text-xs text-[#6B5F4E]">{l.email || "—"} · {l.phone || "—"}</p>
                          {l.message && <p className="mt-1 text-sm text-[#4A3F2E]">{l.message}</p>}
                        </div>
                      ))}
                    </div>
                    {!pro.active && leadsData.total > 3 && (
                      <div className="mt-4 text-center rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                        <p className="text-xs text-[#4A3F2E]">Passez Pro pour voir tous vos leads et exporter en CSV.</p>
                        <button onClick={() => upgrade("monthly")} className="kt-btn-gold text-xs mt-2" data-testid="leads-upgrade">Débloquer Pro</button>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-[#8B7F6E]">Aucun lead pour l'instant. Vos contacts pourront vous laisser un message depuis votre page profil publique.</p>
                )}
              </div>

              {/* Multi-profiles (Pro) */}
              <div className="kt-card p-6" data-testid="section-variants">
                <div className="flex items-center justify-between mb-3">
                  <p className="eyebrow flex items-center gap-2"><Crown size={13} className="text-amber-400" /> Mes profils enregistrés</p>
                  {!pro.active && <span className="text-[10px] text-amber-400 border border-amber-500/40 rounded-full px-2 py-0.5">Pro</span>}
                </div>
                <p className="text-xs text-[#8B7F6E] mb-3">Gardez plusieurs versions (Perso / Pro / Event) et basculez d'un clic sur la même carte.</p>
                {variants.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {variants.map((v) => (
                      <div key={v.id} className="rounded-lg border border-[#1F1B16]/8 bg-white/60 p-3 flex items-center justify-between" data-testid={`variant-${v.id}`}>
                        <div>
                          <p className="text-sm font-medium">{v.label}</p>
                          <p className="text-[11px] text-[#8B7F6E]">{v.profile?.first_name} {v.profile?.last_name} · {v.profile?.job_title || ""}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={async () => {
                            try { const r = await activateVariant(activeSlug, v.id); setProfile(r.profile); await auth.refresh(); toast.success(`« ${v.label} » est maintenant actif`); }
                            catch (e) { toast.error(e.response?.data?.detail || "Erreur"); }
                          }} className="text-xs px-3 py-1 rounded-full border border-amber-400/60 text-amber-300 hover:bg-amber-500/10" data-testid={`activate-${v.id}`}>Activer</button>
                          <button onClick={async () => {
                            if (!window.confirm(`Supprimer « ${v.label} » ?`)) return;
                            try { const r = await deleteVariant(activeSlug, v.id); setVariants(r.variants); toast.success("Supprimé"); }
                            catch { toast.error("Erreur"); }
                          }} className="text-xs px-3 py-1 rounded-full border border-[#1F1B16]/10 text-[#6B5F4E] hover:text-red-400" data-testid={`delete-variant-${v.id}`}>×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {pro.active ? (
                  <button onClick={async () => {
                    const label = window.prompt("Nom de ce profil (ex : Pro, Perso, Event)", "Pro");
                    if (!label) return;
                    try { const r = await addVariant(activeSlug, label, profile); setVariants(r.variants); toast.success(`« ${label} » enregistré`); }
                    catch (e) { toast.error(e.response?.data?.detail || "Erreur"); }
                  }} className="kt-btn-ghost text-xs w-full justify-center" data-testid="btn-add-variant">
                    + Enregistrer le profil courant comme variante
                  </button>
                ) : (
                  <button onClick={() => upgrade("monthly")} className="kt-btn-gold text-xs w-full justify-center" data-testid="btn-variants-upgrade">
                    Débloquer avec Pro
                  </button>
                )}
              </div>

              {/* Danger zone: release card */}
              <div className="kt-card p-6 border-red-500/20" data-testid="section-release">
                <p className="eyebrow text-red-400">Céder cette carte</p>
                <p className="mt-2 text-sm text-[#6B5F4E]">Vous vendez ou donnez votre carte ? Générez un code de transfert unique. Le nouveau propriétaire l'utilisera sur <code className="text-amber-300">/reclaim</code> pour prendre la main. Vos infos actuelles seront effacées.</p>
                <button onClick={doRelease} className="mt-4 kt-btn-ghost text-xs inline-flex items-center gap-2" data-testid="btn-release-card">
                  <RefreshCw size={12} /> Générer un code de transfert
                </button>
              </div>
            </div>

            <aside className="lg:sticky lg:top-24 h-fit">
              <div className="kt-card p-5">
                <p className="eyebrow mb-4">Aperçu en direct</p>
                <div className="flex justify-center py-2">
                  <ProfilePreview profile={profile} />
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

const Field = ({ label, value, onChange, type = "text", testid }) => (
  <div>
    <Label className="text-xs text-[#6B5F4E] mb-1.5 block">{label}</Label>
    <Input
      type={type}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      data-testid={testid}
      className="bg-white/70 border-[#1F1B16]/10 focus:border-amber-400/60 focus:ring-amber-400/20 text-[#1F1B16]"
    />
  </div>
);

const Stat = ({ label, value, testid }) => (
  <div className="rounded-xl border border-[#1F1B16]/8 bg-white/60 p-4">
    <p className="text-xs text-[#6B5F4E]">{label}</p>
    <p className="mt-1 font-display font-bold text-3xl gold-text" data-testid={testid}>{value}</p>
  </div>
);
