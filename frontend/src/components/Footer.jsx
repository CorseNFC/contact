import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-slate-950 mt-24" data-testid="main-footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid md:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 grid place-items-center text-slate-950 font-bold font-display">K</span>
            <span className="font-display font-bold text-lg">KalliTag</span>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">Cartes de visite NFC premium fabriquées en France. Profil à vie, mises à jour illimitées.</p>
        </div>
        <div>
          <p className="eyebrow mb-3">Produits</p>
          <ul className="space-y-2 text-sm text-slate-300">
            <li><Link to="/configurateur?p=card_prestige" className="hover:text-amber-400">Carte NFC Prestige</Link></li>
            <li><Link to="/configurateur?p=plaque_nfc" className="hover:text-amber-400">Plaque NFC</Link></li>
            <li><Link to="/configurateur?p=medaillon_nfc" className="hover:text-amber-400">Médaillon NFC</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-3">Aide</p>
          <ul className="space-y-2 text-sm text-slate-300">
            <li><a href="#faq" className="hover:text-amber-400">FAQ</a></li>
            <li><a href="#tarifs" className="hover:text-amber-400">Tarifs Pro</a></li>
            <li><span className="text-slate-500">Support 7j/7 — Paris</span></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-3">Garanties</p>
          <ul className="space-y-2 text-sm text-slate-300">
            <li>Satisfait ou remboursé 30 jours</li>
            <li>Livraison suivie offerte</li>
            <li>Paiement Stripe SSL 256 bits</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5 py-6 text-center text-xs text-slate-500">© {new Date().getFullYear()} KalliTag — Fait avec soin en France</div>
    </footer>
  );
}
