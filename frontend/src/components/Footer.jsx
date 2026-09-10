import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t border-[#1F1B16]/8 bg-[#FAF7F0] mt-24" data-testid="main-footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid md:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 grid place-items-center text-slate-950 font-bold font-display">K</span>
            <span className="font-display font-bold text-lg">KalliTag</span>
          </div>
          <p className="text-sm text-[#6B5F4E] leading-relaxed">Cartes de visite NFC premium fabriquées en France. Profil à vie, mises à jour illimitées.</p>
        </div>
        <div>
          <p className="eyebrow mb-3">Produit</p>
          <ul className="space-y-2 text-sm text-[#4A3F2E]">
            <li><Link to="/configurateur" className="hover:text-amber-400">Carte NFC Prestige</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-3">Aide</p>
          <ul className="space-y-2 text-sm text-[#4A3F2E]">
            <li><a href="#faq" className="hover:text-amber-400">FAQ</a></li>
            <li><a href="#tarifs" className="hover:text-amber-400">Tarifs Pro</a></li>
            <li><span className="text-[#8B7F6E]">Support 7j/7 — Paris</span></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-3">Garanties</p>
          <ul className="space-y-2 text-sm text-[#4A3F2E]">
            <li>Satisfait ou remboursé 30 jours</li>
            <li>Livraison suivie offerte</li>
            <li>Paiement Stripe SSL 256 bits</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[#1F1B16]/8 py-6 text-center text-xs text-[#8B7F6E]">© {new Date().getFullYear()} KalliTag — Fait avec soin en France</div>
    </footer>
  );
}
