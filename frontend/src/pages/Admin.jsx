import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Package, TrendingUp, Copy, Check, ExternalLink, Truck, RefreshCw, Download, LogOut, Gift, XCircle, Undo2, RotateCcw, Users, ToggleLeft, ToggleRight, Search } from "lucide-react";
import { adminLogin, adminStats, adminOrders, adminMarkShipped, adminUnship, adminSetRevenueStatus, adminExportUrl, adminListLcUsers, adminSetLcActive, getAdminToken, setAdminToken, clearAdminToken } from "@/lib/api";
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
  const [view, setView] = useState("orders"); // "orders" | "lc"
  const [lcUsers, setLcUsers] = useState([]);
  const [lcQuery, setLcQuery] = useState("");
  const [lcOnlyActive, setLcOnlyActive] = useState(false);
  const [lcBusy, setLcBusy] = useState("");

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

  const loadLc = async () => {
    setLoading(true);
    try {
      const r = await adminListLcUsers();
      setLcUsers(r.users || []);
    } catch (e) {
      if (e.response?.status === 401) { clearAdminToken(); setAuthed(false); toast.error("Session expirée"); }
      else toast.error("Erreur de chargement");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!authed) return;
    if (view === "orders") load();
    else loadLc();
  }, [authed, filter, view]); // eslint-disable-line

  const toggleLc = async (u) => {
    const next = !u.lead_capture_active;
    if (!window.confirm(`${next ? "Activer" : "Désactiver"} Lead Capture pour ${u.email} ?`)) return;
    setLcBusy(u.email);
    try {
      await adminSetLcActive(u.email, next);
      toast.success(`${u.email} — Lead Capture ${next ? "activé" : "désactivé"}`);
      setLcUsers((arr) => arr.map((x) => x.email === u.email ? { ...x, lead_capture_active: next } : x));
    } catch { toast.error("Impossible de mettre à jour"); }
    finally { setLcBusy(""); }
  };

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

  const setRevenueStatus = async (o, status) => {
    const labels = { counted: "compté dans le CA", gift: "offert / gratuit", refunded: "remboursé", cancelled: "annulé" };
    try {
      await adminSetRevenueStatus(o.order_id, status);
      toast.success(`Commande marquée : ${labels[status]}`);
      load();
    } catch { toast.error("Erreur mise à jour"); }
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
            <button onClick={view === "orders" ? load : loadLc} className="kt-btn-ghost text-xs inline-flex items-center gap-1.5" data-testid="admin-refresh"><RefreshCw size={13} /> Actualiser</button>
            {view === "orders" && <button onClick={downloadCsv} className="kt-btn-ghost text-xs inline-flex items-center gap-1.5" data-testid="admin-export"><Download size={13} /> CSV</button>}
            <button onClick={logout} className="kt-btn-ghost text-xs inline-flex items-center gap-1.5" data-testid="admin-logout"><LogOut size={13} /> Sortir</button>
          </div>
        </div>

        <div className="flex gap-2 mb-6 border-b border-white/5" data-testid="admin-tabs">
          <button
            onClick={() => setView("orders")}
            data-testid="tab-orders"
            className={`px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${view === "orders" ? "border-amber-400 text-amber-300" : "border-transparent text-slate-500 hover:text-slate-300"}`}
          >
            <Package size={14} className="inline -mt-0.5 mr-1.5" /> Commandes
          </button>
          <button
            onClick={() => setView("lc")}
            data-testid="tab-lc"
            className={`px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${view === "lc" ? "border-amber-400 text-amber-300" : "border-transparent text-slate-500 hover:text-slate-300"}`}
          >
            <Users size={14} className="inline -mt-0.5 mr-1.5" /> Lead Capture
          </button>
        </div>

        {view === "orders" && stats && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-3" data-testid="admin-stats">
              <Card label="Commandes payées" value={stats.paid_orders} testid="stat-paid" />
              <Card label="À expédier" value={stats.to_ship} accent testid="stat-toship" />
              <Card label="Non réclamées" value={stats.unclaimed} testid="stat-unclaimed" />
              <Card label="CA net" value={formatEUR(stats.revenue_cents)} testid="stat-revenue" hint="hors offerts / remboursés / annulés" />
              <Card label="Abonnés Pro" value={stats.active_subs} testid="stat-pro" />
              <Card label="Scans NFC" value={stats.total_scans} testid="stat-scans" />
            </div>
            {stats.excluded_counts && (stats.excluded_counts.gift + stats.excluded_counts.refunded + stats.excluded_counts.cancelled > 0) && (
              <div className="mb-8 text-[11px] text-slate-400 flex flex-wrap gap-3" data-testid="excluded-summary">
                <span>Exclus du CA :</span>
                {stats.excluded_counts.gift > 0 && <span className="text-emerald-300"><Gift size={11} className="inline -mt-0.5 mr-1" />{stats.excluded_counts.gift} offert{stats.excluded_counts.gift > 1 ? "s" : ""}</span>}
                {stats.excluded_counts.refunded > 0 && <span className="text-purple-300"><Undo2 size={11} className="inline -mt-0.5 mr-1" />{stats.excluded_counts.refunded} remboursé{stats.excluded_counts.refunded > 1 ? "s" : ""}</span>}
                {stats.excluded_counts.cancelled > 0 && <span className="text-red-300"><XCircle size={11} className="inline -mt-0.5 mr-1" />{stats.excluded_counts.cancelled} annulé{stats.excluded_counts.cancelled > 1 ? "s" : ""}</span>}
              </div>
            )}
          </>
        )}

        {view === "orders" && (
        <>
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
                  const isBulk = !!o.is_bulk;
                  const bulkUrls = o.nfc_urls || [];
                  const rev = o.revenue_status || "counted";
                  const isExcluded = rev !== "counted";
                  return (
                    <tr key={o.order_id} className={`border-b border-white/5 ${isExcluded ? "opacity-55" : ""}`} data-testid={`order-row-${o.order_id}`}>
                      <td className="p-3 whitespace-nowrap text-slate-400">{new Date(o.created_at).toLocaleDateString("fr-FR")}<br /><span className="text-[10px] text-slate-600">{new Date(o.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span></td>
                      <td className="p-3">
                        <p className="font-medium">{isBulk ? (o.company_name || `Pack ${bulkUrls.length} cartes`) : `${prof.first_name || ""} ${prof.last_name || ""}`}</p>
                        <p className="text-slate-500 text-[11px]">{o.contact_email}</p>
                        {isBulk && <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-amber-300 border border-amber-400/40 rounded-full px-1.5 py-0.5">B2B · {bulkUrls.length} cartes</span>}
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
                        {isBulk && bulkUrls.length > 0 ? (
                          <div className="space-y-1.5 min-w-[320px] max-w-[420px]" data-testid={`bulk-urls-${o.order_id}`}>
                            <p className="text-[10px] text-amber-300 font-bold uppercase tracking-wider mb-1">▸ {bulkUrls.length} URLs à encoder</p>
                            {bulkUrls.map((c, idx) => {
                              const copyId = `${o.order_id}-${idx}`;
                              return (
                                <div key={copyId} className="flex items-center gap-2 bg-slate-900/60 border border-white/5 rounded-md px-2 py-1.5">
                                  <span className="text-[10px] text-slate-500 font-mono w-6 flex-shrink-0">#{String(idx + 1).padStart(2, "0")}</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-semibold text-slate-200 truncate">{c.first_name} {c.last_name}</p>
                                    <p className="font-mono text-[10px] text-amber-300 truncate" data-testid={`bulk-url-${copyId}`}>{c.url}</p>
                                  </div>
                                  <button onClick={() => copyNfc(c.url, copyId)} className="text-slate-400 hover:text-white flex-shrink-0" data-testid={`copy-bulk-${copyId}`} title="Copier">
                                    {copied === copyId ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                  </button>
                                  <a href={c.url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white flex-shrink-0" title="Ouvrir"><ExternalLink size={12} /></a>
                                </div>
                              );
                            })}
                            <button
                              onClick={() => copyNfc(bulkUrls.map((c, i) => `#${i + 1} ${c.first_name} ${c.last_name} — ${c.url}`).join("\n"), `${o.order_id}-all`)}
                              data-testid={`copy-bulk-all-${o.order_id}`}
                              className="mt-2 w-full text-[10px] py-1.5 rounded-md border border-amber-400/40 text-amber-300 hover:bg-amber-500/10 inline-flex items-center justify-center gap-1.5 transition"
                            >
                              {copied === `${o.order_id}-all` ? <><Check size={11} className="text-emerald-400" /> Copié !</> : <><Copy size={11} /> Copier les {bulkUrls.length} liens</>}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 max-w-[280px]">
                            <span className="font-mono text-[10px] text-amber-300 truncate flex-1" data-testid={`nfc-url-${o.order_id}`}>{o.nfc_url}</span>
                            <button onClick={() => copyNfc(o.nfc_url, o.order_id)} className="text-slate-400 hover:text-white" data-testid={`copy-${o.order_id}`}>
                              {copied === o.order_id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                            </button>
                            <a href={o.nfc_url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white"><ExternalLink size={12} /></a>
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-right font-medium">
                        <span className={isExcluded ? "line-through text-slate-500" : ""}>{formatEUR(o.amount_cents)}</span>
                        {isExcluded && <RevenueBadge status={rev} />}
                      </td>
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
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex flex-col items-end gap-1.5">
                          {o.payment_status === "paid" && (
                            isShipped
                              ? <button onClick={() => unship(o)} className="text-[11px] text-slate-500 hover:text-red-400" data-testid={`unship-${o.order_id}`}>Annuler expé.</button>
                              : <button onClick={() => markShipped(o)} className="text-[11px] text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1" data-testid={`ship-${o.order_id}`}>
                                  <Truck size={11} /> Expédier
                                </button>
                          )}
                          {o.payment_status === "paid" && (
                            <select
                              value={rev}
                              onChange={(e) => setRevenueStatus(o, e.target.value)}
                              data-testid={`revenue-status-${o.order_id}`}
                              className="text-[10px] bg-slate-900 border border-white/10 rounded-md px-1.5 py-1 text-slate-300 hover:border-amber-400/60 focus:border-amber-400 focus:outline-none cursor-pointer"
                              title="Comptabilisation dans le chiffre d'affaires"
                            >
                              <option value="counted">✓ Comptée</option>
                              <option value="gift">🎁 Offerte</option>
                              <option value="refunded">↩ Remboursée</option>
                              <option value="cancelled">✕ Annulée</option>
                            </select>
                          )}
                        </div>
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
        </>
        )}

        {view === "lc" && (
          <LcPanel
            users={lcUsers}
            loading={loading}
            query={lcQuery}
            setQuery={setLcQuery}
            onlyActive={lcOnlyActive}
            setOnlyActive={setLcOnlyActive}
            onToggle={toggleLc}
            busyEmail={lcBusy}
          />
        )}
      </div>
    </div>
  );
}

const LcPanel = ({ users, loading, query, setQuery, onlyActive, setOnlyActive, onToggle, busyEmail }) => {
  const q = query.trim().toLowerCase();
  const filtered = users.filter((u) => {
    if (onlyActive && !u.lead_capture_active) return false;
    if (!q) return true;
    return (u.email || "").toLowerCase().includes(q) || (u.name || "").toLowerCase().includes(q);
  });
  const activeCount = users.filter((u) => u.lead_capture_active).length;
  return (
    <div data-testid="lc-panel">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        <Card label="Comptes total" value={users.length} testid="lc-stat-total" />
        <Card label="Lead Capture actifs" value={activeCount} accent testid="lc-stat-active" />
        <Card label="Managers / Commerciaux" value={users.filter((u) => (u.role || "").toUpperCase() !== "MANAGER").length + " commerciaux"} testid="lc-stat-roles" hint={`${users.filter((u) => (u.role || "MANAGER").toUpperCase() === "MANAGER").length} managers`} />
      </div>

      <div className="flex flex-wrap gap-3 items-center mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrer par email ou nom…"
            data-testid="lc-search"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900/60 border border-white/10 focus:border-amber-400/60 focus:outline-none text-sm text-slate-200"
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none" data-testid="lc-toggle-only-active">
          <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} className="accent-amber-500" />
          Actifs uniquement
        </label>
      </div>

      <div className="kt-card overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center"><Loader2 className="animate-spin text-amber-400 mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-slate-500 text-sm">Aucun utilisateur ne correspond.</p>
        ) : (
          <table className="w-full text-xs" data-testid="lc-users-table">
            <thead className="border-b border-white/5 text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Rôle</th>
                <th className="text-left p-3">Plan</th>
                <th className="text-left p-3">Depuis</th>
                <th className="text-right p-3">Lead Capture</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const active = !!u.lead_capture_active;
                const busy = busyEmail === u.email;
                return (
                  <tr key={u.email} className="border-b border-white/5" data-testid={`lc-row-${u.email}`}>
                    <td className="p-3">
                      <p className="font-medium text-slate-200">{u.email}</p>
                      {u.name && <p className="text-slate-500 text-[11px]">{u.name}</p>}
                    </td>
                    <td className="p-3 text-slate-400">
                      <span className="inline-flex text-[10px] uppercase tracking-wider font-medium text-slate-300 border border-white/10 rounded-full px-2 py-0.5">
                        {u.role || "MANAGER"}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400">{u.subscription_plan || <span className="text-slate-600">—</span>}</td>
                    <td className="p-3 text-slate-500 whitespace-nowrap">{u.lead_capture_active_at ? new Date(u.lead_capture_active_at).toLocaleDateString("fr-FR") : (u.created_at ? new Date(u.created_at).toLocaleDateString("fr-FR") : "—")}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => onToggle(u)}
                        disabled={busy}
                        data-testid={`lc-toggle-${u.email}`}
                        className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-full border transition ${active ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20" : "border-white/10 text-slate-400 hover:border-amber-400/60 hover:text-amber-300"} disabled:opacity-50`}
                      >
                        {busy ? <Loader2 size={12} className="animate-spin" /> : active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        {active ? "Actif" : "Inactif"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-4 text-[11px] text-slate-500 text-center">
        Les abonnements Stripe activent/désactivent automatiquement ce flag via webhook. Utilisez ce toggle pour créer un compte demo ou dépanner un cas particulier.
      </p>
    </div>
  );
};

const RevenueBadge = ({ status }) => {
  const map = {
    gift:      { label: "Offerte",    color: "emerald", Icon: Gift },
    refunded:  { label: "Remboursée", color: "purple",  Icon: Undo2 },
    cancelled: { label: "Annulée",    color: "red",     Icon: XCircle },
  };
  const c = map[status]; if (!c) return null;
  const cls = { emerald: "text-emerald-300 border-emerald-400/40", purple: "text-purple-300 border-purple-400/40", red: "text-red-300 border-red-400/40" }[c.color];
  return (
    <span className={`ml-2 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider border rounded-full px-1.5 py-0.5 ${cls}`}>
      <c.Icon size={10} /> {c.label}
    </span>
  );
};

const Card = ({ label, value, accent, testid, hint }) => (
  <div className={`kt-card p-4 ${accent ? "border-amber-400/60" : ""}`}>
    <p className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</p>
    <p className={`mt-1 font-display font-bold text-2xl ${accent ? "gold-text" : ""}`} data-testid={testid}>{value}</p>
    {hint && <p className="text-[9px] text-slate-600 mt-0.5">{hint}</p>}
  </div>
);
