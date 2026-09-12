import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, Users, UserPlus, Mail, Trash2, Check, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Team() {
  const auth = useAuth();
  const [members, setMembers] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => api.get("/team/members").then((r) => setMembers(r.data.members || []));
  useEffect(() => { if (auth.user) load().catch(() => setMembers([])); }, [auth.user]);

  if (auth.loading) return <div className="grid place-items-center min-h-screen"><Loader2 className="animate-spin text-amber-500" /></div>;
  if (!auth.user) return <Navigate to="/connexion" />;

  const invite = async () => {
    if (!inviteEmail.trim()) { toast.error("Email requis"); return; }
    setBusy(true);
    try {
      await api.post("/team/invite", { email: inviteEmail.trim().toLowerCase(), name: inviteName.trim() });
      toast.success(`Invitation envoyée à ${inviteEmail} — un email avec lien magique lui est parti`);
      setInviteEmail(""); setInviteName("");
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Erreur invitation");
    } finally { setBusy(false); }
  };

  const remove = async (email) => {
    if (!window.confirm(`Retirer ${email} de l'équipe ?`)) return;
    try { await api.delete(`/team/members/${encodeURIComponent(email)}`); toast.success("Membre retiré"); load(); }
    catch { toast.error("Erreur"); }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#1F1B16]">
      <Navbar />
      <section className="pt-28 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Link to="/mon-profil" className="inline-flex items-center gap-1.5 text-sm text-[#6B5F4E] hover:text-[#1F1B16] mb-6" data-testid="team-back">
            <ArrowLeft size={14} /> Retour à mon espace
          </Link>

          <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-700 text-[10px] font-bold uppercase tracking-widest">
                <Users size={12} /> Équipe
              </div>
              <h1 className="mt-3 font-display text-4xl font-bold tracking-tight" data-testid="team-title">
                Votre équipe commerciale
              </h1>
              <p className="mt-2 text-sm text-[#6B5F4E]">
                Invitez vos commerciaux — ils reçoivent un lien magique pour activer leur accès Lead Capture.
              </p>
            </div>
          </div>

          {/* Invite form */}
          <div className="kt-card p-6 mb-8" data-testid="team-invite-block">
            <h3 className="eyebrow mb-4 flex items-center gap-2"><UserPlus size={13} /> Inviter un commercial</h3>
            <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
              <div>
                <Label className="text-xs text-[#6B5F4E] mb-1 block">Email</Label>
                <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="commercial@entreprise.fr" data-testid="team-invite-email"
                  className="rounded-xl border-[#1F1B16]/10 focus-visible:border-amber-500" />
              </div>
              <div>
                <Label className="text-xs text-[#6B5F4E] mb-1 block">Prénom Nom (optionnel)</Label>
                <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Jean Dupont" data-testid="team-invite-name"
                  className="rounded-xl border-[#1F1B16]/10 focus-visible:border-amber-500" />
              </div>
              <button onClick={invite} disabled={busy} data-testid="team-invite-submit"
                className="h-11 px-6 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#8B6508] text-white font-bold text-sm inline-flex items-center gap-2 shadow-md active:scale-95 transition disabled:opacity-60">
                {busy ? <Loader2 className="animate-spin" size={16} /> : <><Mail size={16} /> Envoyer</>}
              </button>
            </div>
            <p className="mt-3 text-[11px] text-[#8B7F6E]">
              Le commercial reçoit un email avec un lien magique (30min). Après connexion, son rôle est automatiquement COMMERCIAL et il partage votre abonnement Lead Capture.
            </p>
          </div>

          {/* Members list */}
          <div className="kt-card p-6" data-testid="team-members-block">
            <h3 className="eyebrow mb-4">Membres de l'équipe {members && `· ${members.length}`}</h3>
            {members === null ? (
              <div className="grid place-items-center py-8"><Loader2 className="animate-spin text-amber-500" /></div>
            ) : members.length === 0 ? (
              <p className="text-sm text-[#8B7F6E] italic py-6 text-center">Aucun commercial invité pour le moment.</p>
            ) : (
              <div className="space-y-2">
                {members.map((m) => (
                  <div key={m.email} className="flex items-center gap-3 p-3 rounded-xl border border-[#1F1B16]/8 bg-white" data-testid={`team-member-${m.email}`}>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 grid place-items-center text-white text-xs font-bold">
                      {(m.name || m.email).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{m.name || m.email.split("@")[0]}</p>
                      <p className="text-[11px] text-[#8B7F6E] truncate">{m.email}</p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-700 border border-indigo-500/20">
                      {m.role}
                    </span>
                    {m.lead_capture_active && <Check size={14} className="text-emerald-500" title="Lead Capture actif" />}
                    <button onClick={() => remove(m.email)} data-testid={`team-remove-${m.email}`}
                      className="w-8 h-8 rounded-lg border border-[#1F1B16]/10 grid place-items-center text-[#8B7F6E] hover:text-red-500 hover:border-red-400/50 transition">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
