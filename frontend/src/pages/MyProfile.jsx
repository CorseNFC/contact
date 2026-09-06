import { useEffect, useState, useRef } from "react";
import { Link, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Save, Upload, LogOut, Download, ExternalLink, BarChart3, Copy, Check } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProfilePreview from "@/components/ProfilePreview";
import { useAuth } from "@/context/AuthContext";
import { updateProfile, uploadAvatar, getAnalytics, qrUrl, publicProfileUrl, API } from "@/lib/api";
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
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const fileRef = useRef();

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
  }, [activeSlug]); // eslint-disable-line

  if (auth.loading) return <div className="min-h-screen grid place-items-center bg-slate-950"><Loader2 className="animate-spin text-amber-400" /></div>;
  if (!auth.user) return <Navigate to="/connexion" replace />;
  if (!orders.length) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <Navbar />
        <div className="pt-32 pb-24 max-w-2xl mx-auto px-4 text-center">
          <p className="eyebrow">Espace client</p>
          <h1 className="mt-2 font-display text-3xl font-bold">Aucune commande active</h1>
          <p className="mt-3 text-slate-400">Nous n'avons pas trouvé de commande payée pour <span className="text-amber-400">{auth.user.email}</span>. Passez commande pour créer votre profil.</p>
          <Link to="/configurateur" className="mt-6 inline-flex kt-btn-gold">Commander ma carte</Link>
          <button onClick={auth.logout} className="mt-4 block mx-auto text-xs text-slate-500 hover:text-slate-300">Se déconnecter</button>
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

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const res = await uploadAvatar(f);
      // Build absolute URL served by our backend
      const absolute = `${process.env.REACT_APP_BACKEND_URL}${res.url}`;
      updateField({ avatar_url: absolute });
      toast.success("Photo téléversée — n'oubliez pas d'enregistrer");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload impossible");
    } finally { setUploading(false); e.target.value = ""; }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(publicProfileUrl(activeSlug));
    setCopied(true); setTimeout(() => setCopied(false), 1600);
  };

  const publicUrl = publicProfileUrl(activeSlug);
  const qr = qrUrl(activeSlug);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />
      <div className="pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <p className="eyebrow">Espace client</p>
            <h1 className="mt-2 font-display text-3xl lg:text-4xl font-bold tracking-tight">Mon profil KalliTag</h1>
            <p className="mt-1 text-sm text-slate-400">Connecté en tant que <span className="text-amber-400">{auth.user.email}</span></p>
          </div>
          <button onClick={auth.logout} className="kt-btn-ghost text-xs inline-flex items-center gap-2" data-testid="btn-logout">
            <LogOut size={14} /> Se déconnecter
          </button>
        </div>

        {orders.length > 1 && (
          <div className="mb-6 flex gap-2 flex-wrap">
            {orders.map((o) => (
              <button
                key={o.profile_slug}
                onClick={() => setActiveSlug(o.profile_slug)}
                data-testid={`profile-tab-${o.profile_slug}`}
                className={`px-4 py-2 rounded-full text-xs font-medium border transition ${activeSlug === o.profile_slug ? "border-amber-400 bg-amber-500/10 text-amber-300" : "border-white/10 text-slate-400 hover:text-white"}`}
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
                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm">
                  <span className="font-mono truncate text-amber-300 flex-1" data-testid="public-url">{publicUrl}</span>
                  <button onClick={copyLink} className="text-slate-400 hover:text-white" data-testid="copy-url">
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                  <a href={publicUrl} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white" data-testid="open-url"><ExternalLink size={14} /></a>
                </div>
                <div className="mt-5 grid sm:grid-cols-[auto_1fr] gap-5 items-start">
                  <div className="p-3 bg-white rounded-xl inline-block">
                    <img src={qr} alt="QR" width={140} height={140} data-testid="qr-image" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-300">QR code sticker</p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">Téléchargez-le pour l'imprimer sur un flyer, une devanture, ou l'ajouter à votre signature email — pointe vers votre profil.</p>
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
                    <p className="text-xs text-slate-400 mb-2">Répartition horaire</p>
                    <div className="flex items-end gap-0.5 h-20">
                      {analytics.by_hour.map((v, i) => {
                        const max = Math.max(1, ...analytics.by_hour);
                        return (
                          <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-amber-500/30 to-amber-400" style={{ height: `${(v / max) * 100}%`, minHeight: v ? 4 : 2, opacity: v ? 1 : 0.15 }} title={`${i}h : ${v}`} />
                        );
                      })}
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1"><span>00h</span><span>12h</span><span>23h</span></div>
                  </div>
                )}
                <p className="mt-4 text-[11px] text-slate-500">Analytics avancés (géolocalisation, capture de leads) débloqués avec <span className="text-amber-400">KalliTag Pro</span> — bientôt disponible.</p>
              </div>

              {/* Editor */}
              <div className="kt-card p-6 space-y-5" data-testid="section-editor">
                <p className="eyebrow">Personnaliser mon profil</p>

                <div>
                  <Label className="text-xs text-slate-400 mb-2 block">Photo de profil</Label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-amber-400/50 bg-slate-900 grid place-items-center">
                      {profile.avatar_url
                        ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        : <span className="font-display font-bold text-amber-400 text-xl">{(profile.first_name?.[0] || "") + (profile.last_name?.[0] || "")}</span>}
                    </div>
                    <div>
                      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onFile} className="hidden" data-testid="avatar-input" />
                      <button onClick={() => fileRef.current?.click()} disabled={uploading} className="kt-btn-ghost text-xs inline-flex items-center gap-2" data-testid="btn-upload-avatar">
                        {uploading ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />} Téléverser (max 5 Mo)
                      </button>
                      {profile.avatar_url && (
                        <button onClick={() => updateField({ avatar_url: "" })} className="ml-2 text-xs text-slate-500 hover:text-red-400" data-testid="btn-remove-avatar">Retirer</button>
                      )}
                    </div>
                  </div>
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
                  <Label className="text-xs text-slate-400 mb-2 block">Thème</Label>
                  <div className="flex gap-2 flex-wrap">
                    {themes.map((t) => (
                      <button key={t.id} onClick={() => updateField({ theme_id: t.id })} data-testid={`edit-theme-${t.id}`}
                        className={`px-3 py-1.5 rounded-full text-xs border ${profile.theme_id === t.id ? "border-amber-400 bg-amber-500/10 text-amber-300" : "border-white/10 text-slate-400 hover:text-white"}`}>{t.name}</button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-white/5 pt-5">
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

const Stat = ({ label, value, testid }) => (
  <div className="rounded-xl border border-white/5 bg-slate-900/40 p-4">
    <p className="text-xs text-slate-400">{label}</p>
    <p className="mt-1 font-display font-bold text-3xl gold-text" data-testid={testid}>{value}</p>
  </div>
);
