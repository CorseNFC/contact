import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Package, TrendingUp, Copy, Check, ExternalLink, Truck, RefreshCw, Download, LogOut } from "lucide-react";
import { adminLogin, adminStats, adminOrders, adminMarkShipped, adminUnship, adminExportUrl, getAdminToken, setAdminToken, clearAdminToken } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const formatEUR = (cents) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format((cents || 0) / 100);

export default function Admin() {
  const [authed, setAuthed] = useState(!!getAdminToken());
  const [token, setToken] = useState("");
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("to_ship");
  const [copied, setCopied] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [s, o] = await Promise.all([adminStats(), adminOrders(filter)]);
      setStats(s); setOrders(o.orders || []);
    } catch (e) {
      if (e.response?.status === 401) { clearAdminToken(); setAuthed(false); toast.error("Session expirée"); }
      else toast.error("Erreur de chargement");
    } finally { setLoading(false); }
  };

  useEffect(() => { if (authed) load(); }, [authed, filter]); // eslint-disable-line

  const doLogin = async (e) => {
    e.preventDefault();
    try {
      await adminLogin(token.trim());
      setAdminToken(token.trim());
      setAuthed(true); setToken("");
      toast.success("Connecté");
    } catch { toast.error("Token invalide"); }
  };

  const logout = () => { clearAdminToken(); setAuthed(false); };

  const copyNfc = async (url, id) => {
    await navigator.clipboard.writeText(url);
    setCopied(id); setTimeout(() => setCopied(null), 1600);
  };

  const markShipped = async (o) => {
    const note = window.prompt("Note (optionnel — n° de suivi)", "");
    try { await adminMarkShipped(o.order_id, note || ""); toast.success("Marqué expédié"); load(); }
    catch { toast.error("Erreur"); }
  };

  const unship = async (o) => {
    if (!window.confirm("Annuler l'expédition ?")) return;
    try { await adminUnship(o.order_id); load(); } catch { toast.error("Erreur"); }
  };

  const downloadCsv = async () => {
    // fetch with header, then trigger download
    const r = await fetch(adminExportUrl(), { headers: { "X-Admin-Token": getAdminToken() } });
    if (!r.ok) { toast.error("Export impossible"); return; }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "kallitag-orders.csv";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 grid place-items-center px-4" data-testid="admin-login-page">
        <form onSubmit={doLogin} className="kt-card p-6 w-full max-w-sm space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 grid place-items-center mx-auto">
            <ShieldCheck className="text-amber-400" size={22} />
          </div>
          <div className="text-center">
            <p className="eyebrow">KalliTag Admin</p>
            <h1 className="mt-1 font-display font-bold text-xl">Accès restreint</h1>
          </div>
          <div>
            <Label className="text-xs text-slate-400 mb-1.5 block">Admin Token</Label>
            <Input type="password" value={token} onChange={(e) => setToken(e.target.value)} required autoFocus data-testid="admin-token-input"
                   className="bg-slate-900/60 border-white/10 focus:border-amber-400/60 text-slate-100 font-mono" />
          </div>
          <button type="submit" disabled={!token} className="kt-btn-gold w-full justify-center" data-testid="admin-login-submit">
            Entrer
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-start flex-wrap gap-4 mb-8">
          <div>
            <p className="eyebrow">Admin</p>
            <h1 className="mt-1 font-display text-3xl font-bold">Tableau de bord</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="kt-btn-ghost text-xs inline-flex items-center gap-1.5" data-testid="admin-refresh"><RefreshCw size={13} /> Actualiser</button>
            <button onClick={downloadCsv} className="kt-btn-ghost text-xs inline-flex items-center gap-1.5" data-testid="admin-export"><Download size={13} /> CSV</button>
            <button onClick={logout} className="kt-btn-ghost text-xs inline-flex items-center gap-1.5" data-testid="admin-logout"><LogOut size={13} /> Sortir</button>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8" data-testid="admin-stats">
            <Card label="Commandes payées" value={stats.paid_orders} testid="stat-paid" />
            <Card label="À expédier" value={stats.to_ship} accent testid="stat-toship" />
            <Card label="Non réclamées" value={stats.unclaimed} testid="stat-unclaimed" />
            <Card label="Chiffre d'affaires" value={formatEUR(stats.revenue_cents)} testid="stat-revenue" />
            <Card label="Abonnés Pro" value={stats.active_subs} testid="stat-pro" />
            <Card label="Scans NFC" value={stats.total_scans} testid="stat-scans" />
          </div>
        )}

        <div className="flex gap-2 mb-4 flex-wrap">
          {[["to_ship", "À expédier"], ["paid", "Payées"], ["shipped", "Expédiées"], ["pending", "En attente"], ["", "Toutes"]].map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} data-testid={`filter-${k || "all"}`}
                    className={`text-xs px-3 py-1.5 rounded-full border ${filter === k ? "border-amber-400 bg-amber-500/10 text-amber-300" : "border-white/10 text-slate-400 hover:text-white"}`}>{l}</button>
          ))}
        </div>

        <div className="kt-card overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center"><Loader2 className="animate-spin text-amber-400 mx-auto" /></div>
          ) : orders.length === 0 ? (
            <p className="p-8 text-center text-slate-500 text-sm">Aucune commande dans cette catégorie.</p>
          ) : (
            <table className="w-full text-xs" data-testid="admin-orders-table">
              <thead className="border-b border-white/5 text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Client</th>
                  <th className="text-left p-3">Produit · Finition</th>
                  <th className="text-left p-3">Adresse</th>
                  <th className="text-left p-3">URL NFC à encoder</th>
                  <th className="text-right p-3">Montant</th>
                  <th className="text-center p-3">Statut</th>
                  <th className="text-right p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const prof = o.profile || {}; const ship = o.shipping || {};
                  const isShipped = !!o.shipped;
                  return (
                    <tr key={o.order_id} className="border-b border-white/5" data-testid={`order-row-${o.order_id}`}>
                      <td className="p-3 whitespace-nowrap text-slate-400">{new Date(o.created_at).toLocaleDateString("fr-FR")}<br /><span className="text-[10px] text-slate-600">{new Date(o.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span></td>
                      <td className="p-3">
                        <p className="font-medium">{prof.first_name} {prof.last_name}</p>
                        <p className="text-slate-500 text-[11px]">{o.contact_email}</p>
                      </td>
                      <td className="p-3">
                        <p>{o.product_name}</p>
                        <p className="text-slate-500 text-[11px] uppercase">{prof.finish_id?.replace("_", " ")}</p>
                      </td>
                      <td className="p-3 text-slate-400 min-w-[160px]">
                        {ship.full_name}<br />
                        {ship.line1}<br />
                        <span className="text-slate-500">{ship.postal_code} {ship.city} {ship.country}</span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 max-w-[280px]">
                          <span className="font-mono text-[10px] text-amber-300 truncate flex-1" data-testid={`nfc-url-${o.order_id}`}>{o.nfc_url}</span>
                          <button onClick={() => copyNfc(o.nfc_url, o.order_id)} className="text-slate-400 hover:text-white" data-testid={`copy-${o.order_id}`}>
                            {copied === o.order_id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          </button>
                          <a href={o.nfc_url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white"><ExternalLink size={12} /></a>
                        </div>
                      </td>
                      <td className="p-3 text-right font-medium">{formatEUR(o.amount_cents)}</td>
                      <td className="p-3 text-center">
                        {isShipped ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 border border-emerald-400/40 rounded-full px-2 py-0.5">
                            <Truck size={10} /> Expédiée
                          </span>
                        ) : o.payment_status === "paid" ? (
                          <span className="inline-flex text-[10px] font-medium text-amber-400 border border-amber-400/40 rounded-full px-2 py-0.5">À expédier</span>
                        ) : o.status === "unclaimed" ? (
                          <span className="inline-flex text-[10px] font-medium text-red-400 border border-red-400/40 rounded-full px-2 py-0.5">Non réclamée</span>
                        ) : (
                          <span className="inline-flex text-[10px] font-medium text-slate-500 border border-white/10 rounded-full px-2 py-0.5">{o.payment_status}</span>
                        )}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        {o.payment_status === "paid" && (
                          isShipped
                            ? <button onClick={() => unship(o)} className="text-[11px] text-slate-500 hover:text-red-400" data-testid={`unship-${o.order_id}`}>Annuler</button>
                            : <button onClick={() => markShipped(o)} className="text-[11px] text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1" data-testid={`ship-${o.order_id}`}>
                                <Truck size={11} /> Expédier
                              </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <p className="mt-4 text-[11px] text-slate-500 text-center">
          L'URL NFC ci-dessus est ce que vous devez écrire sur la puce de la carte physique (encodage NFC). Vos clients pourront modifier leur profil à vie sans jamais avoir à ré-encoder la carte.
        </p>
      </div>
    </div>
  );
}

const Card = ({ label, value, accent, testid }) => (
  <div className={`kt-card p-4 ${accent ? "border-amber-400/60" : ""}`}>
    <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
    <p className={`mt-1 font-display font-bold text-2xl ${accent ? "gold-text" : ""}`} data-testid={testid}>{value}</p>
  </div>
);
