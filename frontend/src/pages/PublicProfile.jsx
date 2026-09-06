import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import ProfilePreview from "@/components/ProfilePreview";
import { api } from "@/lib/api";

// vCard v3 generator
function buildVCard(p) {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${p.last_name || ""};${p.first_name || ""};;;`,
    `FN:${(p.first_name || "") + " " + (p.last_name || "")}`.trim(),
  ];
  if (p.job_title) lines.push(`TITLE:${p.job_title}`);
  if (p.company) lines.push(`ORG:${p.company}`);
  if (p.phone) lines.push(`TEL;TYPE=CELL:${p.phone}`);
  if (p.email) lines.push(`EMAIL:${p.email}`);
  const l = p.links || {};
  if (l.website) lines.push(`URL:${l.website}`);
  if (l.linkedin) lines.push(`URL;TYPE=LinkedIn:${l.linkedin}`);
  if (l.instagram) lines.push(`URL;TYPE=Instagram:${l.instagram}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

export default function PublicProfile() {
  const { slug } = useParams();
  const [state, setState] = useState({ status: "loading" });

  useEffect(() => {
    api.get(`/profile/${slug}`)
      .then((r) => setState({ status: "ok", ...r.data }))
      .catch(() => setState({ status: "notfound" }));
  }, [slug]);

  const downloadVCard = (p) => {
    const vcard = buildVCard(p);
    const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(p.first_name || "contact")}-${(p.last_name || "")}.vcf`.replace(/\s+/g, "-");
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast.success("Contact téléchargé !");
  };

  if (state.status === "loading") {
    return <div className="min-h-screen grid place-items-center bg-slate-950" data-testid="profile-loading"><Loader2 className="animate-spin text-amber-400" /></div>;
  }
  if (state.status === "notfound") {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-950 text-center px-4" data-testid="profile-notfound">
        <div>
          <p className="font-display text-2xl font-bold text-slate-100">Profil introuvable</p>
          <p className="mt-2 text-slate-400 text-sm">Ce lien n'existe pas ou la commande n'a pas été confirmée.</p>
          <a href="/" className="mt-6 inline-block kt-btn-ghost">Retour à l'accueil</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full" style={{ background: state.profile.theme_id === "ivory" || state.profile.theme_id === "rose" ? "#F7F3EC" : "#0B0F17" }} data-testid="public-profile-page">
      <div className="max-w-md mx-auto min-h-screen">
        <ProfilePreview
          profile={state.profile}
          framed={false}
          onAction={(k) => k === "vcard" && downloadVCard(state.profile)}
        />
      </div>
    </div>
  );
}
