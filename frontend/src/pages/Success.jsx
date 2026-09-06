import { useEffect, useState, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, ArrowLeft, Mail } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getPaymentStatus, formatEUR } from "@/lib/api";
import { toast } from "sonner";

export default function Success() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [state, setState] = useState({ status: "checking", order: null });
  const attempts = useRef(0);

  useEffect(() => {
    if (!sessionId) { setState({ status: "error" }); return; }
    let cancelled = false;
    const poll = async () => {
      if (cancelled) return;
      try {
        const r = await getPaymentStatus(sessionId);
        if (r.payment_status === "paid") {
          setState({ status: "paid", order: r.order });
          toast.success("Paiement confirmé !");
          return;
        }
        if (attempts.current >= 15) { setState({ status: "timeout" }); return; }
        attempts.current += 1;
        setTimeout(poll, 2000);
      } catch (e) {
        setState({ status: "error" });
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />
      <div className="pt-32 pb-24 max-w-2xl mx-auto px-4 text-center" data-testid="success-page">
        {state.status === "checking" && (
          <>
            <Loader2 className="animate-spin text-amber-400 mx-auto" size={40} />
            <h1 className="mt-6 font-display text-2xl font-bold">Confirmation du paiement…</h1>
            <p className="mt-2 text-slate-400 text-sm">Cela prend habituellement quelques secondes.</p>
          </>
        )}
        {state.status === "paid" && (
          <>
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 grid place-items-center border border-emerald-500/30">
              <CheckCircle2 className="text-emerald-400" size={32} />
            </div>
            <h1 className="mt-6 font-display text-3xl lg:text-4xl font-bold tracking-tight">Merci pour votre commande !</h1>
            <p className="mt-3 text-slate-400">Un email de confirmation vient d'être envoyé. Nous préparons votre carte et l'expédions sous 5 jours ouvrés.</p>
            {state.order && (
              <div className="kt-card mt-8 p-6 text-left" data-testid="order-recap">
                <div className="flex justify-between items-baseline">
                  <p className="eyebrow">Récapitulatif</p>
                  <span className="font-mono text-xs text-slate-500">#{state.order.order_id?.slice(0,8).toUpperCase()}</span>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-400">Produit</span><span>{state.order.product_name} × {state.order.quantity}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Montant</span><span className="font-display font-bold text-amber-400">{formatEUR(state.order.amount_cents)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Confirmation</span><span className="inline-flex items-center gap-1"><Mail size={12} /> {state.order.contact_email}</span></div>
                </div>
              </div>
            )}
            <Link to="/" className="kt-btn-ghost mt-8 inline-flex" data-testid="success-back-home"><ArrowLeft size={16} /> Retour à l'accueil</Link>
          </>
        )}
        {(state.status === "error" || state.status === "timeout") && (
          <>
            <h1 className="font-display text-2xl font-bold">Paiement en cours de traitement</h1>
            <p className="mt-3 text-slate-400">Si votre paiement a été débité, un email vous confirmera la commande dans quelques minutes.</p>
            <Link to="/" className="kt-btn-ghost mt-6 inline-flex">Retour</Link>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
