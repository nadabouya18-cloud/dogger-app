import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

const BREED_SIZE = {
  'Affenpinscher': 'xs', 'Bichon Frisé': 'xs', 'Bichon Maltais': 'xs', 'Chihuahua': 'xs',
  'Spitz Nain': 'xs', 'Yorkshire Terrier': 'xs', 'Caniche Toy': 'xs', 'Pinscher Nain': 'xs',
  'Shih Tzu': 'xs', 'Cairn Terrier': 'xs', 'Lhassa Apso': 'xs',
  'Beagle': 's', 'Boston Terrier': 's', 'Bouledogue Français': 's', 'Caniche Nain': 's',
  'Cavalier King Charles': 's', 'Cocker Américain': 's', 'Cocker Spaniel': 's',
  'Fox Terrier': 's', 'Jack Russell': 's', 'Shiba Inu': 's', 'Teckel': 's',
  'Whippet': 's', 'Basenji': 's',
  'Berger Australien': 'm', 'Border Collie': 'm', 'Boxer': 'm', 'Braque de Weimar': 'm',
  'Bull Terrier': 'm', 'Bulldog Anglais': 'm', 'Caniche Royal': 'm', 'Colley': 'm',
  'Dalmatien': 'm', 'Épagneul Breton': 'm', 'Husky Sibérien': 'm', 'Labrador': 'm',
  'Golden Retriever': 'm', 'Pointer': 'm', 'Setter Irlandais': 'm',
  'Springer Spaniel': 'm', 'Staffordshire Bull Terrier': 'm',
  'Akita Inu': 'l', 'Alaskan Malamute': 'l', 'Berger Allemand': 'l',
  'Berger Belge Malinois': 'l', 'Bouledogue Américain': 'l', 'Chow-Chow': 'l',
  'Dobermann': 'l', 'Dogue Allemand': 'l', 'Dogue de Bordeaux': 'l',
  'Greyhound': 'l', 'Leonberg': 'l', 'Mastiff': 'l', 'Montagne des Pyrénées': 'l',
  'Rottweiler': 'l', 'Saint-Bernard': 'l', 'Samoyède': 'l', 'Terre-Neuve': 'l',
};

const BREEDS = Object.keys(BREED_SIZE).sort().concat(['Autre']);

const SIZE_LABELS = {
  xs: { label: '🐩 XS', desc: '< 10 kg', color: '#9B59B6' },
  s:  { label: '🐕 S',  desc: '10–20 kg', color: '#3498DB' },
  m:  { label: '🦮 M',  desc: '20–35 kg', color: '#E67E22' },
  l:  { label: '🐕 L', desc: '> 35 kg',  color: '#E24B4A' },
};

export default function AddDog() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [form, setForm] = useState({
    dogName: '', dogBreed: '', dogSize: '', dogGender: '', dogAge: 2, dogNotes: '', dogPhoto: ''
  });
  const [error, setError] = useState('');
  const [autoSize, setAutoSize] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoValid, setPhotoValid] = useState(false);
  const [photoError, setPhotoError] = useState('');

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate('/login'); return; }
      setUserId(session.user.id);
    });
  }, [navigate]);

  useEffect(() => {
    if (form.dogBreed && BREED_SIZE[form.dogBreed]) {
      const size = BREED_SIZE[form.dogBreed];
      setAutoSize(size);
      update('dogSize', size);
    } else {
      setAutoSize(null);
    }
  }, [form.dogBreed]);

  const handlePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setPhotoError('Fichier invalide'); return; }
    if (file.size > 5 * 1024 * 1024) { setPhotoError('Photo trop lourde (max 5 Mo)'); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      update('dogPhoto', ev.target.result);
      setPhotoError('');
      setPhotoValid(false);
      setPhotoLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      setPhotoValid(true);
      setPhotoLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!form.dogPhoto) { setError('La photo est obligatoire'); return; }
    if (!photoValid) { setError('Attendez la validation de la photo'); return; }
    if (!form.dogName) { setError('Entrez le nom de votre chien'); return; }
    if (!form.dogGender) { setError('Sélectionnez le genre'); return; }
    if (!form.dogBreed) { setError('Sélectionnez une race'); return; }
    if (!form.dogSize) { setError('Sélectionnez un gabarit'); return; }
    setError('');
    setLoading(true);
    try {
      const { error: dogError } = await supabase.from('dogs').insert({
        owner_id: userId,
        name: form.dogName,
        breed: form.dogBreed,
        size: form.dogSize,
        gender: form.dogGender,
        age: form.dogAge,
        notes: form.dogNotes,
        photo_url: form.dogPhoto,
      });
      if (dogError) throw dogError;
      navigate('/dashboard');
    } catch (e) {
      setError('Une erreur est survenue — réessayez');
    } finally {
      setLoading(false);
    }
  };

  const formatAge = (age) => {
    if (age === 0) return 'Moins de 1 an';
    if (age === 1) return '1 an';
    if (age >= 15) return '15 ans et +';
    return `${age} ans`;
  };

  const inputStyle = {
    width: '100%', padding: '14px 16px', borderRadius: 12,
    border: '1.5px solid #E8E8E8', fontSize: 15, fontFamily: 'inherit',
    outline: 'none', background: '#FAFAFA', color: '#1A1A1A',
    marginBottom: 12, boxSizing: 'border-box'
  };
  const labelStyle = { fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6, display: 'block' };

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", maxWidth: 430, margin: '0 auto' }}>

      <div style={{ background: 'linear-gradient(160deg, #0F6E56 0%, #1D9E75 100%)', padding: '48px 24px 32px' }}>
        <button onClick={() => navigate('/dashboard')}
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 10, padding: '8px 14px', fontSize: 14, cursor: 'pointer', marginBottom: 20 }}>
          ← Retour
        </button>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🐾</div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Ajouter un chien</h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>Complétez le profil de votre nouveau compagnon</p>
      </div>

      <div style={{ padding: '28px 24px' }}>

        {/* PHOTO */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div onClick={() => !photoLoading && document.getElementById('dogPhotoInput').click()}
            style={{ width: 110, height: 110, borderRadius: '50%', background: form.dogPhoto ? 'transparent' : '#E1F5EE', border: photoError ? '2.5px solid #E24B4A' : photoValid ? '2.5px solid #1D9E75' : '2.5px dashed #1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', margin: '0 auto 10px', overflow: 'hidden', position: 'relative' }}>
            {form.dogPhoto
              ? <img src={form.dogPhoto} alt="chien" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32 }}>🐾</div>
                  <div style={{ fontSize: 11, color: '#E24B4A', marginTop: 4, fontWeight: 700 }}>Requis *</div>
                </div>
            }
            {photoLoading && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 24 }}>🔍</div>
              </div>
            )}
            {photoValid && !photoLoading && (
              <div style={{ position: 'absolute', bottom: 4, right: 4, width: 26, height: 26, borderRadius: '50%', background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>✅</div>
            )}
          </div>
          <input id="dogPhotoInput" type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
          <div style={{ fontSize: 12, color: photoError ? '#E24B4A' : photoValid ? '#1D9E75' : '#AAA', fontWeight: photoError || photoValid ? 600 : 400 }}>
            {photoError ? `⚠️ ${photoError}` : photoValid ? '✅ Photo validée' : 'Photo obligatoire · JPG ou PNG · max 5 Mo'}
          </div>
        </div>

        {/* NOM */}
        <label style={labelStyle}>Nom *</label>
        <input style={inputStyle} placeholder="Rex, Luna, Nala..." value={form.dogName}
          onChange={e => update('dogName', e.target.value)} />

        {/* GENRE */}
        <label style={labelStyle}>Genre *</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[{ id: 'male', label: '♂️ Mâle' }, { id: 'female', label: '♀️ Femelle' }].map(g => (
            <div key={g.id} onClick={() => update('dogGender', g.id)}
              style={{ padding: '14px', borderRadius: 12, border: form.dogGender === g.id ? '2px solid #1D9E75' : '1.5px solid #E8E8E8', background: form.dogGender === g.id ? '#E1F5EE' : '#FAFAFA', cursor: 'pointer', textAlign: 'center', fontSize: 16, fontWeight: form.dogGender === g.id ? 700 : 400, color: form.dogGender === g.id ? '#0F6E56' : '#555' }}>
              {g.label}
            </div>
          ))}
        </div>

        {/* ÂGE */}
        <label style={labelStyle}>Âge * — <span style={{ color: '#1D9E75', fontWeight: 700 }}>{formatAge(form.dogAge)}</span></label>
        <div style={{ marginBottom: 16 }}>
          <input type="range" min="0" max="15" step="1" value={form.dogAge}
            onChange={e => update('dogAge', parseInt(e.target.value))}
            style={{ width: '100%', accentColor: '#1D9E75', cursor: 'pointer' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#AAA', marginTop: 4 }}>
            <span>Chiot</span><span>5 ans</span><span>10 ans</span><span>15 ans+</span>
          </div>
        </div>

        {/* RACE */}
        <label style={labelStyle}>Race *</label>
        <select style={{ ...inputStyle, appearance: 'none' }} value={form.dogBreed}
          onChange={e => update('dogBreed', e.target.value)}>
          <option value="">Sélectionner une race</option>
          {BREEDS.map(b => <option key={b} value={b}>{b}</option>)}
        </select>

        {/* GABARIT */}
        <label style={labelStyle}>
          Gabarit *
          {autoSize && <span style={{ marginLeft: 8, background: '#E1F5EE', color: '#0F6E56', fontSize: 11, padding: '2px 8px', borderRadius: 8, fontWeight: 600 }}>✨ Auto</span>}
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          {Object.entries(SIZE_LABELS).map(([id, s]) => {
            const isLocked = autoSize && autoSize !== id;
            return (
              <div key={id} onClick={() => !isLocked && update('dogSize', id)}
                style={{ padding: '14px', borderRadius: 12, textAlign: 'center', border: form.dogSize === id ? `2px solid ${s.color}` : '1.5px solid #E8E8E8', background: form.dogSize === id ? '#E1F5EE' : '#FAFAFA', cursor: isLocked ? 'not-allowed' : 'pointer', opacity: isLocked ? 0.3 : 1 }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 12, color: '#888' }}>{s.desc}</div>
              </div>
            );
          })}
        </div>

        {autoSize && (
          <div style={{ background: '#E1F5EE', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#0F6E56', marginBottom: 16, fontWeight: 500 }}>
            ✨ Un {form.dogBreed} est automatiquement classé en gabarit {SIZE_LABELS[autoSize].desc}
          </div>
        )}

        {/* NOTES */}
        <label style={labelStyle}>Notes spéciales (optionnel)</label>
        <textarea style={{ ...inputStyle, height: 80, resize: 'none' }}
          placeholder="Allergies, médicaments, comportement particulier..."
          value={form.dogNotes} onChange={e => update('dogNotes', e.target.value)} />

        {error && (
          <div style={{ background: '#FFF0F0', border: '1px solid #FFD0D0', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#E24B4A', marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading}
          style={{ width: '100%', padding: 16, background: loading ? '#A8D5C4' : 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: loading ? 'default' : 'pointer', boxShadow: '0 4px 16px rgba(29,158,117,0.35)' }}>
          {loading ? 'Ajout en cours...' : 'Ajouter mon chien 🐾'}
        </button>

      </div>
    </div>
  );
}
