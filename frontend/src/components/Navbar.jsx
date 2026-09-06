import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, LogIn, LayoutDashboard, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const link = (to, label, testid) => (
    <Link
      to={to}
      onClick={() => setOpen(false)}
      data-testid={testid}
      className={`text-sm font-medium transition-colors ${pathname === to ? "text-amber-400" : "text-slate-300 hover:text-white"}`}
    >
      {label}
    </Link>
  );
  return (
    <nav className="glass-nav fixed top-0 left-0 right-0 z-50" data-testid="main-navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2" data-testid="nav-logo">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 grid place-items-center text-slate-950 font-bold font-display">K</span>
          <span className="font-display font-bold text-lg tracking-tight">KalliTag</span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {link("/", "Accueil", "nav-home")}
          {link("/configurateur", "Configurer", "nav-configurator")}
          <a href="#tarifs" className="text-sm font-medium text-slate-300 hover:text-white" data-testid="nav-pricing">Tarifs</a>
          <a href="#faq" className="text-sm font-medium text-slate-300 hover:text-white" data-testid="nav-faq">FAQ</a>
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link to="/mon-profil" className="kt-btn-ghost text-sm hidden sm:inline-flex items-center gap-2" data-testid="nav-dashboard">
                <LayoutDashboard size={14} /> Mon espace
              </Link>
              <button onClick={() => { logout(); nav("/"); }} className="text-slate-400 hover:text-white p-2" data-testid="nav-logout" title="Se déconnecter">
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <Link to="/connexion" className="text-sm text-slate-300 hover:text-white hidden sm:inline-flex items-center gap-1.5" data-testid="nav-login">
              <LogIn size={14} /> Connexion
            </Link>
          )}
          <Link to="/configurateur" className="kt-btn-gold text-sm hidden sm:inline-flex" data-testid="nav-cta-order">
            Commander
          </Link>
          <button className="md:hidden text-slate-200" onClick={() => setOpen(!open)} data-testid="nav-menu-toggle" aria-label="menu">
            <Menu size={22} />
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-white/5 bg-slate-950/95 px-4 py-4 space-y-3">
          {link("/", "Accueil", "nav-home-mobile")}
          <div />{link("/configurateur", "Configurer", "nav-configurator-mobile")}
          <div />{user ? link("/mon-profil", "Mon espace", "nav-dashboard-mobile") : link("/connexion", "Connexion", "nav-login-mobile")}
        </div>
      )}
    </nav>
  );
}
