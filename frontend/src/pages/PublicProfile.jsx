import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, ExternalLink, Star, PawPrint, Phone, Mail, MapPin } from "lucide-react";
import { toast } from "sonner";
import ProfilePreview from "@/components/ProfilePreview";
import { api, trackScan, submitLead } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function buildVCard(p) {
  const lines = ["BEGIN:VCARD", "VERSION:3.0",
    `N:${p.last_name || ""};${p.first_name || ""};;;`,
    `FN:${((p.first_name || "") + " " + (p.last_name || "")).trim()}`];
  if (p.job_title) lines.push(`TITLE:${p.job_title}`);
  if (p.company) lines.push(`ORG:${p.company}`);
  if (p.phone) lines.push(`TEL;TYPE=CELL:${p.phone}`);
  if (p.email) lines.push(`EMAIL:${p.email}`);
  const l = p.links || {};
  if (l.website) lines.push(`URL:${l.website}`);
  if (l.linkedin) lines.push(`URL;TYPE=LinkedIn:${l.linkedin}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

export default function PublicProfile() {
  const { slug } = useParams();
  const [state, setState] = useState({ status: "loading" });
  const [leadOpen, setLeadOpen] = useState(false);
  const [lead, setLead] = useState({ name: "", email: "", phone: "", message: "" });

  useEffect(() => {
    api.get(`/profile/${slug}`)
      .then((r) => setState({ status: "ok", ...r.data }))
      .catch(() => setState({ status: "notfound" }));
    trackScan(slug).catch(() => {});
  }, [slug]);

  useEffect(() => {
    // reviews plaque : redirect straight to Google
    if (state.status === "ok" && state.product_kind === "reviews" && state.profile?.reviews_url) {
      setTimeout(() => { window.location.replace(state.profile.reviews_url); }, 1200);
    }
  }, [state]);

  const downloadVCard = (p) => {
    const vcard = buildVCard(p);
    const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `${(p.first_name || p.owner_name || "contact")}-${(p.last_name || "")}.vcf`.replace(/\s+/g, "-");
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast.success("Contact téléchargé !");
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      await submitLead(slug, lead);
      toast.success("Message envoyé — vous serez recontacté(e).");
      setLeadOpen(false); setLead({ name: "", email: "", phone: "", message: "" });
    } catch { toast.error("Envoi impossible"); }
  };

  if (state.status === "loading") return <div className="min-h-screen grid place-items-center bg-[#FAF7F0]" data-testid="profile-loading"><Loader2 className="animate-spin text-amber-400" /></div>;
  if (state.status === "notfound") return (
    <div className="min-h-screen grid place-items-center bg-[#FAF7F0] text-center px-4" data-testid="profile-notfound">
      <div>
        <p className="font-display text-2xl font-bold text-[#1F1B16]">Profil introuvable</p>
        <p className="mt-2 text-[#6B5F4E] text-sm">Ce lien n'existe pas ou la commande n'a pas été confirmée.</p>
        <a href="/" className="mt-6 inline-block kt-btn-ghost">Retour à l'accueil</a>
      </div>
    </div>
  );

  const p = state.profile;
  const kind = state.product_kind;

  if (kind === "reviews") {
    return (
      <div className="min-h-screen bg-[#FAF7F0] grid place-items-center px-4" data-testid="reviews-redirect">
        <div className="max-w-sm text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 grid place-items-center border border-amber-500/30">
            <Star className="text-amber-400" size={28} fill="currentColor" />
          </div>
          <h1 className="mt-6 font-display text-2xl font-bold text-[#1F1B16]">Merci pour votre soutien !</h1>
          <p className="mt-2 text-[#6B5F4E] text-sm">
            {p.reviews_message || `${p.business_name || "Nous"} vous remercie. Vous allez être redirigé(e) vers Google Avis…`}
          </p>
          {p.reviews_url ? (
            <a href={p.reviews_url} className="kt-btn-gold mt-6 inline-flex" data-testid="reviews-cta">Laisser un avis <ExternalLink size={16} /></a>
          ) : (
            <p className="mt-4 text-xs text-[#8B7F6E]">Le propriétaire n'a pas encore configuré l'URL Google.</p>
          )}
        </div>
      </div>
    );
  }

  if (kind === "pet") {
    const themeBg = "#0B0F17";
    return (
      <div className="min-h-screen w-full py-8 px-4" style={{ background: themeBg }} data-testid="pet-profile-page">
        <div className="max-w-md mx-auto">
          <div className="kt-card p-6 text-center">
            <div className="w-24 h-24 mx-auto rounded-full border-2 border-amber-500 overflow-hidden bg-white grid place-items-center">
              {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : <PawPrint size={40} className="text-amber-400" />}
            </div>
            <h1 className="mt-4 font-display font-bold text-2xl gold-text">{p.pet_name || "Mon compagnon"}</h1>
            <p className="text-sm text-[#6B5F4E] mt-1">
              {p.pet_species || "Animal"}{p.pet_breed ? ` · ${p.pet_breed}` : ""}{p.pet_sex ? ` · ${p.pet_sex}` : ""}
            </p>
            {p.lost_message && (
              <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                <p className="eyebrow mb-1">Si vous m'avez trouvé</p>
                <p className="text-sm text-slate-200">{p.lost_message}</p>
              </div>
            )}
            <div className="mt-5 space-y-2 text-left">
              {p.owner_name && <Row icon={PawPrint} label="Propriétaire" value={p.owner_name} />}
              {p.owner_phone && <Row icon={Phone} label="Téléphone" value={p.owner_phone} href={`tel:${p.owner_phone}`} />}
              {p.owner_email && <Row icon={Mail} label="Email" value={p.owner_email} href={`mailto:${p.owner_email}`} />}
              {p.vet_contact && <Row icon={MapPin} label="Vétérinaire" value={p.vet_contact} />}
              {p.chip_number && <Row icon={PawPrint} label="Puce ID" value={p.chip_number} mono />}
              {p.medical_notes && <Row icon={PawPrint} label="Notes médicales" value={p.medical_notes} />}
            </div>
            {p.owner_phone && (
              <a href={`tel:${p.owner_phone}`} className="kt-btn-gold w-full justify-center mt-6" data-testid="pet-call-owner">
                <Phone size={16} /> Appeler le propriétaire
              </a>
            )}
            <p className="mt-6 text-[10px] text-[#8B7F6E]">Propulsé par <span className="text-amber-400">KalliTag</span></p>
          </div>
        </div>
      </div>
    );
  }

  // Default: profile
  const themeBg = ["ivory", "rose"].includes(p.theme_id) ? "#F7F3EC" : "#0B0F17";
  return (
    <div className="min-h-screen w-full" style={{ background: themeBg }} data-testid="public-profile-page">
      <div className="max-w-md mx-auto min-h-screen">
        <ProfilePreview profile={p} framed={false} onAction={(k) => k === "vcard" && downloadVCard(p)} />
        <div className="px-5 pb-8">
          <button onClick={() => setLeadOpen((v) => !v)} className="w-full text-xs font-medium py-2.5 rounded-full border border-white/10 text-[#4A3F2E] hover:text-white hover:border-amber-400/40" data-testid="lead-toggle">
            {leadOpen ? "Annuler" : "Me laisser un message"}
          </button>
          {leadOpen && (
            <form onSubmit={submit} className="kt-card p-4 mt-3 space-y-3" data-testid="lead-form">
              <Input value={lead.name} onChange={(e) => setLead({ ...lead, name: e.target.value })} placeholder="Votre nom" required data-testid="lead-name" className="bg-white/70 border-[#1F1B16]/10 text-[#1F1B16]" />
              <Input value={lead.email} onChange={(e) => setLead({ ...lead, email: e.target.value })} placeholder="Email (optionnel)" type="email" data-testid="lead-email" className="bg-white/70 border-[#1F1B16]/10 text-[#1F1B16]" />
              <Input value={lead.phone} onChange={(e) => setLead({ ...lead, phone: e.target.value })} placeholder="Téléphone (optionnel)" data-testid="lead-phone" className="bg-white/70 border-[#1F1B16]/10 text-[#1F1B16]" />
              <textarea value={lead.message} onChange={(e) => setLead({ ...lead, message: e.target.value })} placeholder="Votre message" rows={3} className="w-full px-3 py-2 rounded-md bg-white/70 border border-[#1F1B16]/10 text-[#1F1B16] text-sm" data-testid="lead-message" />
              <button type="submit" className="kt-btn-gold w-full justify-center text-sm" data-testid="lead-submit">Envoyer</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

const Row = ({ icon: Icon, label, value, href, mono }) => {
  const content = (
    <div className="flex items-start gap-3 py-2">
      <Icon size={16} className="text-amber-400 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-[#8B7F6E]">{label}</p>
        <p className={`text-sm text-[#1F1B16] ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
      </div>
    </div>
  );
  return href ? <a href={href} className="block hover:bg-white/[0.03] rounded-lg -mx-2 px-2">{content}</a> : content;
};
