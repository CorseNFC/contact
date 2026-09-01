'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setMessage(`❌ ${error.message}`);
      else {
        setMessage('✅ Compte créé ! Vous pouvez maintenant vous connecter.');
        setIsSignUp(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(`❌ ${error.message}`);
      else router.push('/dashboard');
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f4f7', fontFamily: 'sans-serif' }}>
      <div style={{ backgroundColor: '#fff', padding: '32px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', width: '100%', maxWidth: '400px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', textAlign: 'center' }}>
          {isSignUp ? 'Créer un compte VCard' : 'Connexion VCard SaaS'}
        </h1>
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px', textAlign: 'center' }}>
          {isSignUp ? 'Inscrivez-vous pour créer votre carte NFC' : 'Gérez votre carte de visite virtuelle'}
        </p>

        {message && (
          <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: message.startsWith('✅') ? '#e6f4ea' : '#fce8e6', color: message.startsWith('✅') ? '#137333' : '#c5221f', fontSize: '14px', marginBottom: '16px' }}>
            {message}
          </div>
        )}

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '14px', fontWeight: '500' }}>Adresse Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="votre@email.com" style={{ width: '100%', padding: '10px', marginTop: '6px', borderRadius: '8px', border: '1px solid #ccc' }} />
          </div>

          <div>
            <label style={{ fontSize: '14px', fontWeight: '500' }}>Mot de passe</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" style={{ width: '100%', padding: '10px', marginTop: '6px', borderRadius: '8px', border: '1px solid #ccc' }} />
          </div>

          <button type="submit" disabled={loading} style={{ padding: '12px', backgroundColor: '#0070f3', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', marginTop: '8px' }}>
            {loading ? 'Chargement...' : (isSignUp ? "S'inscrire" : 'Se connecter')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button onClick={() => { setIsSignUp(!isSignUp); setMessage(''); }} style={{ background: 'none', border: 'none', color: '#0070f3', cursor: 'pointer', fontSize: '14px' }}>
            {isSignUp ? 'Déjà un compte ? Se connecter' : "Pas encore de compte ? S'inscrire"}
          </button>
        </div>
      </div>
    </div>
  );
}
