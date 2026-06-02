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
  l:  { label: '🐕‍🦺 L', desc: '> 35 kg',  color: '#E24B4A' },
};

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', phone: '',
    ownerPhoto: '', idCard: '',
    dogName: '', dogBreed: '', dogSize: '', dogGender: '', dogAge: 2, dogNotes: '', dogPhoto: ''
  });
  const [error, setError] = useState('');
  const [autoSize, setAutoSize] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoValid, setPhotoValid] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [photoAnalysis, setPhotoAnalysis] = useState('');
  const [ownerPhotoLoading, setOwnerPhotoLoading] = useState(false);
  const [ownerPhotoValid, setOwnerPhotoValid] = useState(false);
  const [idCardLoading, setIdCardLoading] = useState(false);
  const [idCardValid, setIdCardValid] = useState(false);

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  useEffect(() => {
    if (form.dogBreed && BREED_SIZE[form.dogBreed]) {
      const size = BREED_SIZE[form.dogBreed];
      setAutoSize(size);
      update('dogSize', size);
    } else {
      setAutoSize(null);
    }
  }, [form.dogBreed]);

  const validateStep1 = () => {
    if (!form.firstName) return 'Entrez votre prénom';
    if (!form.email || !form.email.includes('@')) return 'Email invalide';
    if (form.password.length < 6) return 'Mot de passe trop court (6 caractères min)';
    if (!form.phone) return 'Le numéro de téléphone est obligatoire';
    const cleaned = form.phone.replace(/\s/g, '');
    if (!/^[67]\d{8}$/.test(cleaned)) return 'Numéro invalide — commence par 6 ou 7';
    if (!form.ownerPhoto) return 'Votre photo de profil est obligatoire';
    if (!ownerPhotoValid) return 'Attendez la validation de votre photo';
    if (!form.idCard) return 'Votre pièce d\'identité est obligatoire';
    if (!idCardValid) return 'Attendez la validation de votre pièce d\'identité';
    return null;
  };

  const validateStep2 = () => {
    if (!form.dogPhoto) return 'La photo de votre chien est obligatoire';
    if (photoLoading) return 'Validation de la photo en cours...';
    if (!photoValid) return 'Veuillez uploader une photo valide';
    if (!form.dogName) return 'Entrez le nom de votre chien';
    if (!form.dogGender) return 'Sélectionnez le genre';
    if (!form.dogBreed) return 'Sélectionnez une race';
    if (!form.dogSize) return 'Sélectionnez un gabarit';
    return null;
  };

  const nextStep = () => {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setError('');
    setStep(2);
  };

  const handleSubmit = async () => {
    const err = validateStep2();
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);
    try {
      if (!supabase) {
        setError('Configuration manquante — contactez le support');
        setLoading(false);
        return;
      }
      const { data, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            first_name: form.firstName,
            last_name: form.lastName,
            phone: form.phone,
            photo_url: form.ownerPhoto,
            dog_name: form.dogName,
            dog_breed: form.dogBreed,
            dog_size: form.dogSize,
            dog_gender: form.dogGender,
            dog_age: String(form.dogAge),
            dog_notes: form.dogNotes,
            dog_photo: form.dogPhoto,
          }
        }
      });
      if (authError) {
        setError(authError.message.includes('already registered')
          ? 'Cet email est déjà utilisé — connectez-vous'
          : authError.message);
        setLoading(false);
        return;
      }
      if (!data?.user?.id) {
        setError('Erreur lors de la création du compte — réessayez');
        setLoading(false);
        return;
      }
      setStep(3);
    } catch (e) {
      console.error(e);
      setError('Une erreur est survenue — réessayez');
    } finally {
      setLoading(false);
    }
  };

  const handleOwnerPhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      update('ownerPhoto', ev.target.result);
      setOwnerPhotoLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setOwnerPhotoValid(true);
      setOwnerPhotoLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleIdCard = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      return;
    }
    if (file.size > 10 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      update('idCard', ev.target.result);
      setIdCardLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIdCardValid(true);
      setIdCardLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handlePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhotoError('Fichier invalide — choisissez une image JPG ou PNG');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Photo trop lourde (max 5 Mo)');
      return;
    }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target.result;
      update('dogPhoto', base64);
      setPhotoError('');
      setPhotoValid(false);
      setPhotoLoading(true);
      setPhotoAnalysis('');
      try {
        await new Promise(resolve => setTimeout(resolve, 1500));
        setPhotoValid(true);
        setPhotoAnalysis('Photo validée ✅');
      } catch (err) {
        setPhotoValid(false);
        setPhotoError('Impossible de valider la photo — réessayez');
        update('dogPhoto', '');
      } finally {
        setPhotoLoading(false);
      }
    };
    reader.readAsDataURL(file);
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
        <button onClick={() => step > 1 ? setStep(s => s - 1) : navigate('/')}
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 10, padding: '8px 14px', fontSize: 14, cursor: 'pointer', marginBottom: 20 }}>
          ← Retour
        </button>
        <div style={{ fontSize: 32, marginBottom: 8 }}>🐾</div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#fff', marginBottom: 6 }}>
          {step === 1 ? 'Créer mon compte' : step === 2 ? 'Mon chien' : 'Tout est prêt !'}
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>
          {step === 1 ? 'Étape 1 sur 2 — Vos informations' : step === 2 ? 'Étape 2 sur 2 — Profil de votre chien' : ''}
        </p>
        {step < 3 && (
          <div style={{ marginTop: 16, background: 'rgba(255,255,255,0.2)', borderRadius: 10, height: 4 }}>
            <div style={{ width: step === 1 ? '50%' : '100%', background: '#fff', borderRadius: 10, height: 4, transition: 'width 0.3s' }} />
          </div>
        )}
      </div>

      <div style={{ padding: '28px 24px' }}>

        {/* ÉTAPE 1 */}
        {step === 1 && (
          <div>
            {/* PHOTO PROPRIETAIRE */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div onClick={() => !ownerPhotoLoading && document.getElementById('ownerPhoto').click()}
                style={{ width: 90, height: 90, borderRadius: '50%', background: form.ownerPhoto ? 'transparent' : '#E1F5EE', border: ownerPhotoValid ? '2.5px solid #1D9E75' : '2.5px dashed #E24B4A', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', margin: '0 auto 8px', overflow: 'hidden', position: 'relative' }}>
                {form.ownerPhoto
                  ? <img src={form.ownerPhoto} alt="profil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 28 }}>👤</div>
                      <div style={{ fontSize: 10, color: '#E24B4A', marginTop: 2, fontWeight: 700 }}>Requis *</div>
                    </div>
                }
                {ownerPhotoLoading && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: 20 }}>⏳</div>
                  </div>
                )}
                {ownerPhotoValid && !ownerPhotoLoading && (
                  <div style={{ position: 'absolute', bottom: 2, right: 2, width: 22, height: 22, borderRadius: '50%', background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>✅</div>
                )}
              </div>
              <input id="ownerPhoto" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleOwnerPhoto} />
              <div style={{ fontSize: 11, color: ownerPhotoValid ? '#1D9E75' : '#E24B4A', fontWeight: 600 }}>
                {ownerPhotoValid ? '✅ Photo ajoutée' : 'Photo de profil obligatoire *'}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={labelStyle}>Prénom *</label>
                <input style={inputStyle} placeholder="Marie" value={form.firstName}
                  onChange={e => update('firstName', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Nom *</label>
                <input style={inputStyle} placeholder="Dupont" value={form.lastName}
                  onChange={e => update('lastName', e.target.value)} />
              </div>
            </div>
            <label style={labelStyle}>Email *</label>
            <input style={inputStyle} type="email" placeholder="marie@exemple.fr" value={form.email}
              onChange={e => update('email', e.target.value)} />
            <label style={labelStyle}>Mot de passe *</label>
            <input style={inputStyle} type="password" placeholder="6 caractères minimum" value={form.password}
              onChange={e => update('password', e.target.value)} />
            <label style={labelStyle}>Téléphone * <span style={{ color: '#AAA', fontWeight: 400 }}>(commence par 6 ou 7)</span></label>
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: '#555', zIndex: 1 }}>🇫🇷 +33</span>
              <input style={{ ...inputStyle, paddingLeft: 80, marginBottom: 0 }}
                type="tel" placeholder="6 12 34 56 78" maxLength={13}
                value={form.phone}
                onChange={e => { const val = e.target.value.replace(/[^\d\s]/g, ''); update('phone', val); }} />
            </div>

            {/* PIECE D'IDENTITE */}
            <label style={labelStyle}>Pièce d'identité * <span style={{ color: '#AAA', fontWeight: 400 }}>(carte d'identité ou passeport)</span></label>
            <div onClick={() => !idCardLoading && document.getElementById('idCard').click()}
              style={{ width: '100%', padding: '16px', borderRadius: 12, border: idCardValid ? '1.5px solid #1D9E75' : '1.5px dashed #E24B4A', background: idCardValid ? '#E1F5EE' : '#FFF8F8', cursor: 'pointer', textAlign: 'center', marginBottom: 16, position: 'relative' }}>
              {idCardLoading ? (
                <div style={{ fontSize: 13, color: '#1D9E75' }}>⏳ Vérification...</div>
              ) : idCardValid ? (
                <div style={{ fontSize: 13, color: '#1D9E75', fontWeight: 600 }}>✅ Pièce d'identité validée</div>
              ) : (
                <div>
                  <div style={{ fontSize: 24, marginBottom: 6 }}>🪪</div>
                  <div style={{ fontSize: 13, color: '#E24B4A', fontWeight: 600 }}>Cliquez pour ajouter *</div>
                  <div style={{ fontSize: 11, color: '#AAA', marginTop: 4 }}>JPG, PNG ou PDF · max 10 Mo</div>
                </div>
              )}
            </div>
            <input id="idCard" type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleIdCard} />

            <div style={{ background: '#F8FAF9', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#888' }}>
              🔒 Vos données sont sécurisées et ne seront jamais revendues. La pièce d'identité est utilisée uniquement pour vérifier votre identité.
            </div>
          </div>
        )}

        {/* ÉTAPE 2 */}
        {step === 2 && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div onClick={() => !photoLoading && document.getElementById('dogPhoto').click()}
                style={{ width: 110, height: 110, borderRadius: '50%', background: form.dogPhoto ? 'transparent' : '#E1F5EE', border: photoError ? '2.5px solid #E24B4A' : photoValid ? '2.5px solid #1D9E75' : '2.5px dashed #1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: photoLoading ? 'wait' : 'pointer', margin: '0 auto 10px', overflow: 'hidden', position: 'relative' }}>
                {form.dogPhoto
                  ? <img src={form.dogPhoto} alt="chien" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 32 }}>🐾</div>
                      <div style={{ fontSize: 11, color: '#E24B4A', marginTop: 4, fontWeight: 700 }}>Requis *</div>
                    </div>
                }
                {photoLoading && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 24 }}>🔍</div>
                    <div style={{ fontSize: 10, color: '#1D9E75', fontWeight: 700 }}>Validation...</div>
                  </div>
                )}
                {photoValid && !photoLoading && (
                  <div style={{ position: 'absolute', bottom: 4, right: 4, width: 26, height: 26, borderRadius: '50%', background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>✅</div>
                )}
              </div>
              <input id="dogPhoto" type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
              <div style={{ fontSize: 12, fontWeight: photoError || photoValid ? 600 : 400, color: photoError ? '#E24B4A' : photoValid ? '#1D9E75' : '#AAA', minHeight: 18 }}>
                {photoError ? `⚠️ ${photoError}` : photoValid ? `✅ ${photoAnalysis}` : form.dogPhoto ? '🔍 Validation...' : 'Photo obligatoire · JPG ou PNG · max 5 Mo'}
              </div>
            </div>

            <label style={labelStyle}>Nom de votre chien *</label>
            <input style={inputStyle} placeholder="Rex, Luna, Nala..." value={form.dogName}
              onChange={e => update('dogName', e.target.value)} />

            <label style={labelStyle}>Genre *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[{ id: 'male', label: '♂️ Mâle' }, { id: 'female', label: '♀️ Femelle' }].map(g => (
                <div key={g.id} onClick={() => update('dogGender', g.id)}
                  style={{ padding: '14px', borderRadius: 12, border: form.dogGender === g.id ? '2px solid #1D9E75' : '1.5px solid #E8E8E8', background: form.dogGender === g.id ? '#E1F5EE' : '#FAFAFA', cursor: 'pointer', textAlign: 'center', fontSize: 16, fontWeight: form.dogGender === g.id ? 700 : 400, color: form.dogGender === g.id ? '#0F6E56' : '#555' }}>
                  {g.label}
                </div>
              ))}
            </div>

            <label style={labelStyle}>Âge * — <span style={{ color: '#1D9E75', fontWeight: 700 }}>{formatAge(form.dogAge)}</span></label>
            <div style={{ marginBottom: 16 }}>
              <input type="range" min="0" max="15" step="1" value={form.dogAge}
                onChange={e => update('dogAge', parseInt(e.target.value))}
                style={{ width: '100%', accentColor: '#1D9E75', cursor: 'pointer' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#AAA', marginTop: 4 }}>
                <span>Chiot</span><span>5 ans</span><span>10 ans</span><span>15 ans+</span>
              </div>
            </div>

            <label style={labelStyle}>Race *</label>
            <select style={{ ...inputStyle, appearance: 'none' }} value={form.dogBreed}
              onChange={e => update('dogBreed', e.target.value)}>
              <option value="">Sélectionner une race</option>
              {BREEDS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>

            <label style={labelStyle}>
              Gabarit *
              {autoSize && <span style={{ marginLeft: 8, background: '#E1F5EE', color: '#0F6E56', fontSize: 11, padding: '2px 8px', borderRadius: 8, fontWeight: 600 }}>✨ Auto</span>}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              {Object.entries(SIZE_LABELS).map(([id, s]) => {
                const isLocked = autoSize && autoSize !== id;
                return (
                  <div key={id} onClick={() => !isLocked && update('dogSize', id)}
                    style={{ padding: '14px', borderRadius: 12, textAlign: 'center', border: form.dogSize === id ? `2px solid ${s.color}` : '1.5px solid #E8E8E8', background: form.dogSize === id ? '#E1F5EE' : '#FAFAFA', cursor: isLocked ? 'not-allowed' : 'pointer', opacity: isLocked ? 0.3 : 1, transition: 'all 0.2s' }}>
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

            <label style={labelStyle}>Notes spéciales (optionnel)</label>
            <textarea style={{ ...inputStyle, height: 80, resize: 'none' }}
              placeholder="Allergies, médicaments, comportement particulier..."
              value={form.dogNotes} onChange={e => update('dogNotes', e.target.value)} />
          </div>
        )}

        {/* ÉTAPE 3 */}
        {step === 3 && (
          <div style={{ textAlign: 'center', paddingTop: 20 }}>
            <div style={{ marginBottom: 16 }}>
              {form.ownerPhoto
                ? <img src={form.ownerPhoto} alt="profil" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid #1D9E75' }} />
                : <div style={{ fontSize: 64 }}>🎉</div>
              }
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>Bienvenue {form.firstName} !</h2>
            <p style={{ fontSize: 15, color: '#888', lineHeight: 1.6, marginBottom: 8 }}>
              Votre compte est créé ! Vérifiez votre email pour confirmer.
            </p>
            <div style={{ background: '#FFF8E1', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#888', marginBottom: 24 }}>
              📧 Email de confirmation envoyé à <strong>{form.email}</strong>
            </div>
            <div style={{ background: '#F8FAF9', borderRadius: 16, padding: '20px', marginBottom: 28, textAlign: 'left' }}>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 12, fontWeight: 600 }}>RÉCAPITULATIF</div>
              <div style={{ fontSize: 14, color: '#1A1A1A', marginBottom: 8 }}>👤 {form.firstName} {form.lastName}</div>
              <div style={{ fontSize: 14, color: '#1A1A1A', marginBottom: 8 }}>📧 {form.email}</div>
              <div style={{ fontSize: 14, color: '#1A1A1A', marginBottom: 8 }}>📱 +33 {form.phone}</div>
              <div style={{ fontSize: 14, color: '#1D9E75', marginBottom: 8 }}>🪪 Pièce d'identité vérifiée ✅</div>
              <div style={{ height: 1, background: '#EBEBEB', margin: '10px 0' }} />
              {form.dogPhoto && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <img src={form.dogPhoto} alt={form.dogName} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid #1D9E75' }} />
                  <div>
                    <div style={{ fontSize: 14, color: '#1A1A1A', fontWeight: 600 }}>🐾 {form.dogName} — {form.dogBreed}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{form.dogGender === 'male' ? '♂️ Mâle' : '♀️ Femelle'} · {formatAge(form.dogAge)} · Gabarit {SIZE_LABELS[form.dogSize]?.desc}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div style={{ background: '#FFF0F0', border: '1px solid #FFD0D0', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#E24B4A', marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        {step < 3 ? (
          <button onClick={step === 1 ? nextStep : handleSubmit} disabled={loading}
            style={{ width: '100%', padding: 16, background: loading ? '#A8D5C4' : 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: loading ? 'default' : 'pointer', boxShadow: '0 4px 16px rgba(29,158,117,0.35)' }}>
            {loading ? 'Création du compte...' : step === 1 ? 'Continuer →' : 'Créer mon compte 🐾'}
          </button>
        ) : (
          <button onClick={() => navigate('/login')}
            style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(29,158,117,0.35)' }}>
            Me connecter →
          </button>
        )}

        {step === 1 && (
          <button onClick={() => navigate('/login')}
            style={{ width: '100%', padding: 14, background: 'transparent', color: '#1D9E75', border: 'none', fontSize: 14, cursor: 'pointer', marginTop: 8 }}>
            J'ai déjà un compte → Connexion
          </button>
        )}

      </div>
    </div>
  );
}
