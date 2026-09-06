import { Link } from "react-router-dom";
import { XCircle, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function Cancel() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />
      <div className="pt-32 pb-24 max-w-2xl mx-auto px-4 text-center" data-testid="cancel-page">
        <div className="w-16 h-16 mx-auto rounded-full bg-slate-800 grid place-items-center border border-white/10">
          <XCircle className="text-slate-400" size={32} />
        </div>
        <h1 className="mt-6 font-display text-3xl font-bold tracking-tight">Paiement annulé</h1>
        <p className="mt-3 text-slate-400">Aucun montant n'a été débité. Votre configuration a été conservée — reprenez quand vous voulez.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/configurateur" className="kt-btn-gold" data-testid="cancel-retry">Reprendre la commande</Link>
          <Link to="/" className="kt-btn-ghost inline-flex items-center gap-2"><ArrowLeft size={16} /> Accueil</Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
