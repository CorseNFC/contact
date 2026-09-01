'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const [form, setForm] = useState({
    slug: '',
    full_name: '',
    job_title: '',
    company: '',
    phone: '',
    email: '',
    website: '',
    bio: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setMessage('❌ Vous devez être connecté pour enregistrer votre profil.');
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        ...form,
        updated_at: new Date().toISOString()
      });

    if (error) {
      setMessage(`❌ Erreur : ${error.message}`);
    } else {
      setMessage('✅ Carte VCard enregistrée avec succès !');
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Éditer ma VCard</h1>
      
      {message && <p style={{ padding: '10px', background: '#eee', borderRadius: '4px' }}>{message}</p>}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label>Identifiant unique (Slug / Lien URL) :</label>
          <input 
            type="text" 
            name="slug" 
            placeholder="ex: lisa-webert" 
            value={form.slug} 
            onChange={handleChange}
            required 
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        <div>
          <label>Nom complet :</label>
          <input 
            type="text" 
            name="full_name" 
            value={form.full_name} 
            onChange={handleChange}
            required 
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        <div>
          <label>Poste / Intitulé de poste :</label>
          <input 
            type="text" 
            name="job_title" 
            value={form.job_title} 
            onChange={handleChange}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        <div>
          <label>Entreprise :</label>
          <input 
            type="text" 
            name="company" 
            value={form.company} 
            onChange={handleChange}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        <div>
          <label>Téléphone :</label>
          <input 
            type="tel" 
            name="phone" 
            value={form.phone} 
            onChange={handleChange}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        <div>
          <label>Email de contact :</label>
          <input 
            type="email" 
            name="email" 
            value={form.email} 
            onChange={handleChange}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        <div>
          <label>Site Web :</label>
          <input 
            type="url" 
            name="website" 
            value={form.website} 
            onChange={handleChange}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        <div>
          <label>Biographie / Présentation :</label>
          <textarea 
            name="bio" 
            rows={3} 
            value={form.bio} 
            onChange={handleChange}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{ padding: '12px', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          {loading ? 'Enregistrement...' : 'Enregistrer la VCard'}
        </button>
      </form>
    </div>
  );
}