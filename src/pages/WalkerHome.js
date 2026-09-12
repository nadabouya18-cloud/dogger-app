import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

const SIZE_ICONS = { xs: '🐩', s: '🐕', m: '🦮', l: '🐕‍🦺' };

// Temps laissé au promeneur pour répondre à une nouvelle mission avant
// qu'elle ne soit automatiquement refusée (et proposée à un autre promeneur).
const MISSION_TIMER_SECONDS = 60;

// Créneaux horaires proposés pour déclarer ses disponibilités, jour par
// jour sur un vrai calendrier (pas un modèle récurrent par jour de semaine)
// — mêmes heures que celles proposées au propriétaire lors d'une réservation
// planifiée.
const AVAIL_SLOTS = [
  '06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00',
  '15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00',
];

// Aide & Support — FAQ promeneur. Pur affichage : les réponses décrivent le
// fonctionnement réel de l'app, aucune donnée en base.
const SUPPORT_FAQ = [
  { q: 'Comment recevoir des missions ?', a: "Activez votre disponibilité depuis l'accueil. Une demande immédiate s'affiche alors 60 secondes : passé ce délai, elle repart vers un autre promeneur." },
  { q: 'Comment déclarer mes disponibilités ?', a: "Profil → « Mes disponibilités ». Touchez un jour, puis choisissez « Toute la journée » ou des créneaux précis. Les raccourcis « Étendre à une période » et « Tout le mois » évitent de valider jour par jour. Rien ne se reconduit automatiquement d'une semaine à l'autre." },
  { q: "J'ai raté une demande planifiée", a: "Les demandes planifiées ne déclenchent pas d'alerte à 60 secondes : elles vous attendent dans « Demandes planifiées », sur l'accueil. Vous pouvez discuter avec le propriétaire avant d'accepter ou de refuser." },
  { q: 'Pourquoi dois-je prendre des photos ?', a: "Une photo à la prise en charge et une au retour protègent tout le monde en cas de litige. Sans elles, la mission ne peut ni démarrer ni se terminer." },
  { q: 'Comment est calculée ma note ?', a: "C'est la moyenne des notes laissées par vos clients après chaque balade. Tant que personne ne vous a noté, votre profil affiche « Nouveau » plutôt qu'une fausse note." },
  { q: 'Où voir mes gains ?', a: "Onglet « Gains » : le calendrier montre les jours travaillés, un clic sur un jour affiche les missions. Les virements ne sont pas encore actifs dans cette version." },
  { q: 'Le propriétaire ne vient pas récupérer son chien', a: "Restez sur place si vous le pouvez, prévenez-le dans la discussion et signalez-le avec le formulaire ci-dessous. En cas de danger, appelez le 17." },
];

const SUPPORT_SUBJECTS = ['Problème sur une balade', 'Gains et paiement', 'Mon compte', 'Un propriétaire', "Bug dans l'application", 'Autre'];

export default function WalkerHome() {
 const navigate = useNavigate();
 const [tab, setTab] = useState('home');
 const [profileLoading, setProfileLoading] = useState(true);
 const [profile, setProfile] = useState(null);
 const [walkerProfile, setWalkerProfile] = useState(null);
 const [available, setAvailable] = useState(false);
 const [phase, setPhase] = useState('idle');
 const [mission, setMission] = useState(null);
 const [missionTimer, setMissionTimer] = useState(MISSION_TIMER_SECONDS);
 const [walkTime, setWalkTime] = useState(0);
 const [history, setHistory] = useState([]);
 const [rating, setRating] = useState(0);
 const [showRating, setShowRating] = useState(false);
 const [walkerId, setWalkerId] = useState(null);
 const [locationStatus, setLocationStatus] = useState('idle'); // idle | pending | shared | denied | unsupported | error
 const [showCancelledNotice, setShowCancelledNotice] = useState(false);
 const [showIncidentNotice, setShowIncidentNotice] = useState(false);
 const [messages, setMessages] = useState([]);
 const [newMessage, setNewMessage] = useState('');
 const [showChat, setShowChat] = useState(false);
 const [sendingPhoto, setSendingPhoto] = useState(false);
 const [historyChat, setHistoryChat] = useState(null); // { bookingId, owner, dog } | null — mission passée dont on consulte l'historique
 const [historyMessages, setHistoryMessages] = useState([]);
 const [historyLoading, setHistoryLoading] = useState(false);
 // Aide & Support
 const [openFaq, setOpenFaq] = useState(null);
 const [supportTickets, setSupportTickets] = useState([]);
 const [supportLoading, setSupportLoading] = useState(false);
 const [supportForm, setSupportForm] = useState({ subject: '', bookingId: '', message: '' });
 const [supportSending, setSupportSending] = useState(false);
 const [supportSent, setSupportSent] = useState(false);
 const [supportError, setSupportError] = useState('');

 const [clientRatings, setClientRatings] = useState([]); // notes (1-5) laissées par les propriétaires — la vraie note publique

 // Édition du profil (infos + bio + photo)
 const [editMode, setEditMode] = useState(false);
 const [editForm, setEditForm] = useState({ first_name: '', last_name: '', phone: '', bio: '' });
 const [editLoading, setEditLoading] = useState(false);
 const [editSuccess, setEditSuccess] = useState(false);
 const [newWalkerPhoto, setNewWalkerPhoto] = useState(null);

 // Sécurité — changement de mot de passe
 const [currentPassword, setCurrentPassword] = useState('');
 const [newPassword, setNewPassword] = useState('');
 const [confirmPassword, setConfirmPassword] = useState('');
 const [passwordError, setPasswordError] = useState('');
 const [passwordSuccess, setPasswordSuccess] = useState(false);
 const [passwordSaving, setPasswordSaving] = useState(false);

 // Historique calendrier (onglet Gains) — pour alléger l'affichage plutôt
 // qu'une liste sans fin de toutes les missions jamais faites.
 const [calMonth, setCalMonth] = useState(() => { const d = new Date(); d.setDate(1); return d; });
 const [calSelectedDate, setCalSelectedDate] = useState(null);

 // Mes disponibilités (Balade / Garde à domicile), déclarées jour par jour
 // sur un vrai calendrier (pas un modèle récurrent par jour de semaine) —
 // servent à recevoir de vraies demandes planifiées plutôt que des demandes
 // envoyées au hasard. `availability[service][dateStr]` = { fullDay, slots }.
 const [availService, setAvailService] = useState('walk');
 const [availCalMonth, setAvailCalMonth] = useState(() => { const d = new Date(); d.setDate(1); return d; });
 // Un ou plusieurs jours peuvent être sélectionnés à la fois (période "du 1er
 // au 20", ou mois entier en un tap) — `availSelectedDates` est toujours un
 // tableau, même pour un seul jour, pour n'avoir qu'un seul enregistrement à
 // gérer. `availRangeAnchor`/`availPickingRange` gèrent le tap-tap "premier
 // jour puis dernier jour" pour composer une période.
 const [availSelectedDates, setAvailSelectedDates] = useState([]);
 const [availRangeAnchor, setAvailRangeAnchor] = useState(null);
 const [availPickingRange, setAvailPickingRange] = useState(false);
 const [availability, setAvailability] = useState({ walk: {}, home: {} });
 const [availLoading, setAvailLoading] = useState(false);
 const [availDayFullDay, setAvailDayFullDay] = useState(false);
 const [availDaySlots, setAvailDaySlots] = useState([]);
 const [availSaving, setAvailSaving] = useState(false);
 const [availSuccess, setAvailSuccess] = useState(false);

 // Demandes de balades planifiées reçues (en attente, ou déjà confirmées en
 // avance) — distinctes des missions immédiates : pas d'alerte 60s, on peut
 // les consulter et en discuter tranquillement avant de répondre.
 const [scheduledRequests, setScheduledRequests] = useState([]);
 const [confirmedScheduled, setConfirmedScheduled] = useState([]);
 const [scheduledActionLoading, setScheduledActionLoading] = useState(null);
 const [reqChatBooking, setReqChatBooking] = useState(null);
 const [reqChatMessages, setReqChatMessages] = useState([]);
 const [reqChatInput, setReqChatInput] = useState('');
 const chatEndRef = useRef(null);
 const mapRef = useRef(null);
 const mapInstanceRef = useRef(null);
 const walkerTimerRef = useRef(null);
 const missionTimerRef = useRef(null);

 // Charger le profil promeneur connecté
 useEffect(() => {
   const loadProfile = async () => {
     try {
       const { data: { session } } = await supabase.auth.getSession();
       if (!session) { navigate('/login?redirect=walker'); return; }
       const { data: profileData } = await supabase
         .from('profiles').select('*').eq('id', session.user.id).single();
       const { data: walkerData } = await supabase
         .from('walker_profiles').select('*').eq('id', session.user.id).maybeSingle();
       if (!walkerData) { navigate('/register-walker'); return; }
       const { data: walksData } = await supabase
         .from('walks').select('*').eq('walker_id', session.user.id)
         .order('created_at', { ascending: false }).limit(200);
       // La vraie note publique du promeneur vient des propriétaires
       // (une note par propriétaire et par balade), pas d'une auto-évaluation.
       const { data: ratedBookings } = await supabase
         .from('bookings').select('owner_rating').eq('walker_id', session.user.id)
         .not('owner_rating', 'is', null);
       setClientRatings((ratedBookings || []).map(b => b.owner_rating));
       setProfile(profileData);
       setWalkerProfile(walkerData);
       setEditForm({
         first_name: profileData?.first_name || '',
         last_name: profileData?.last_name || '',
         phone: profileData?.phone || '',
         bio: walkerData?.bio || '',
       });
       setWalkerId(session.user.id);
       setAvailable(!!walkerData.available);
       if (walksData) {
         setHistory(walksData.map(w => ({
           id: w.id,
           owner: w.owner_name,
           dog: w.dog_name,
           service: w.service,
           duration: w.duration,
           price: Number(w.price),
           rating: w.rating,
           date: new Date(w.created_at).toLocaleDateString('fr-FR'),
           createdAt: w.created_at,
           bookingId: w.booking_id,
         })));
       }
     } catch (e) {
       console.error(e);
     } finally {
       setProfileLoading(false);
     }
   };
   loadProfile();
 }, [navigate]);

 const handleLogout = async () => {
   await supabase.auth.signOut();
   navigate('/');
 };

 // Modifier son profil (infos + bio + photo) — même logique que côté
 // propriétaire, avec en plus la bio qui vit sur walker_profiles (visible
 // par les clients) plutôt que sur profiles.
 const handleSaveProfile = async () => {
   setEditLoading(true);
   try {
     const { data: { session } } = await supabase.auth.getSession();
     if (!session) return;
     // Prénom et nom fixés à la création du compte : non modifiables ici
     // (verrou également posé en base par le déclencheur trg_lock_profile_name).
     const updates = { phone: editForm.phone };
     if (newWalkerPhoto) updates.photo_url = newWalkerPhoto;
     const { error: profileError } = await supabase.from('profiles').update(updates).eq('id', session.user.id);
     const { error: walkerError } = await supabase.from('walker_profiles').update({ bio: editForm.bio }).eq('id', session.user.id);
     if (!profileError && !walkerError) {
       setProfile(p => ({ ...p, ...updates }));
       setWalkerProfile(w => ({ ...w, bio: editForm.bio }));
       setEditSuccess(true);
       setEditMode(false);
       setNewWalkerPhoto(null);
       setTimeout(() => setEditSuccess(false), 3000);
     }
   } catch (e) { console.error(e); }
   finally { setEditLoading(false); }
 };

 const handleWalkerPhotoChange = (e) => {
   const file = e.target.files[0];
   if (!file) return;
   const reader = new FileReader();
   reader.onload = (ev) => setNewWalkerPhoto(ev.target.result);
   reader.readAsDataURL(file);
 };

 // Charge mes disponibilités déclarées (Balade + Garde à domicile), une
 // ligne par jour précis et par service en base, regroupées ici par service
 // puis par date — sert à la fois à marquer les jours sur le calendrier et à
 // pré-remplir l'éditeur du jour sélectionné.
 useEffect(() => {
   if (tab !== 'availability' || !walkerId) return;
   const loadAvailability = async () => {
     setAvailLoading(true);
     const { data } = await supabase.from('walker_availability').select('*').eq('walker_id', walkerId);
     const grouped = { walk: {}, home: {} };
     (data || []).forEach(row => {
       grouped[row.service] = grouped[row.service] || {};
       grouped[row.service][row.date] = { fullDay: !!row.full_day, slots: Array.isArray(row.slots) ? row.slots : [] };
     });
     setAvailability(grouped);
     setAvailLoading(false);
   };
   loadAvailability();
 }, [tab, walkerId]);

 // Toucher un jour seul sur le calendrier le sélectionne et charge son état
 // actuel (déjà connu localement, pas besoin d'une nouvelle requête) dans
 // l'éditeur — c'est aussi le point de départ si on veut ensuite étendre à
 // une période.
 const selectSingleDate = (dateStr) => {
   setAvailSuccess(false);
   setAvailPickingRange(false);
   setAvailRangeAnchor(dateStr);
   setAvailSelectedDates([dateStr]);
 };

 // Démarre le "tap du dernier jour" d'une période, à partir du jour déjà
 // sélectionné (qui sert d'ancre).
 const startRangePicking = () => {
   if (availSelectedDates.length !== 1) return;
   setAvailRangeAnchor(availSelectedDates[0]);
   setAvailPickingRange(true);
 };

 // Termine la période entre le jour ancré et celui qu'on vient de toucher,
 // quel que soit l'ordre des deux (ex : ancre le 20, on touche le 1er → la
 // période va bien du 1er au 20). Le réglage (journée entière / créneaux)
 // choisi ensuite s'appliquera à tous ces jours d'un coup.
 const completeRangePicking = (dateStr) => {
   const start = availRangeAnchor < dateStr ? availRangeAnchor : dateStr;
   const end = availRangeAnchor < dateStr ? dateStr : availRangeAnchor;
   const dates = [];
   const cur = new Date(`${start}T00:00:00`);
   const endD = new Date(`${end}T00:00:00`);
   while (cur <= endD) {
     dates.push(dayKey(cur));
     cur.setDate(cur.getDate() + 1);
   }
   setAvailSuccess(false);
   setAvailPickingRange(false);
   setAvailSelectedDates(dates);
   setAvailDayFullDay(false);
   setAvailDaySlots([]);
 };

 const handleCalendarDayClick = (dateStr) => {
   if (availPickingRange && availRangeAnchor) {
     completeRangePicking(dateStr);
   } else {
     selectSingleDate(dateStr);
   }
 };

 // Coche en un tap tous les jours à venir (à partir d'aujourd'hui) du mois
 // affiché — pratique pour dire "je suis dispo tout le mois".
 const selectWholeMonth = () => {
   const dates = [];
   for (let d = 1; d <= availCalDaysInMonth; d++) {
     const dateStr = `${availCalYear}-${String(availCalMonthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
     if (dateStr >= todayKey) dates.push(dateStr);
   }
   setAvailSuccess(false);
   setAvailPickingRange(false);
   setAvailSelectedDates(dates);
   setAvailDayFullDay(false);
   setAvailDaySlots([]);
 };

 const clearAvailSelection = () => {
   setAvailSelectedDates([]);
   setAvailRangeAnchor(null);
   setAvailPickingRange(false);
 };

 // On change de service (Balade / Garde à domicile), ou de sélection, sans
 // perdre les jours choisis : pour un seul jour, l'éditeur se recharge avec
 // l'état déjà connu de ce jour pour ce service. Pour plusieurs jours (période
 // ou mois entier), on repart d'un réglage vierge — les jours choisis peuvent
 // avoir des états différents entre eux, impossible à pré-remplir sans ambiguïté.
 useEffect(() => {
   if (availSelectedDates.length !== 1) return;
   const existing = availability[availService]?.[availSelectedDates[0]];
   setAvailDayFullDay(existing?.fullDay || false);
   setAvailDaySlots(existing?.slots || []);
 }, [availService, availSelectedDates, availability]);

 const toggleAvailDayFullDay = () => {
   setAvailSuccess(false);
   setAvailDayFullDay(v => !v);
 };

 const toggleAvailDaySlot = (time) => {
   setAvailSuccess(false);
   setAvailDaySlots(prev => prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time]);
 };

 // Enregistre tous les jours actuellement sélectionnés en un seul appel
 // groupé (même réglage pour chacun) — que ce soit un jour, une période, ou
 // un mois entier.
 const saveAvailDays = async () => {
   if (!walkerId || availSelectedDates.length === 0) return;
   setAvailSaving(true);
   try {
     const rows = availSelectedDates.map(dateStr => ({
       walker_id: walkerId,
       service: availService,
       date: dateStr,
       full_day: availDayFullDay,
       slots: availDayFullDay ? [] : availDaySlots,
       updated_at: new Date().toISOString(),
     }));
     const { error } = await supabase.from('walker_availability').upsert(rows, { onConflict: 'walker_id,service,date' });
     if (!error) {
       setAvailability(prev => {
         const updatedService = { ...(prev[availService] || {}) };
         availSelectedDates.forEach(dateStr => {
           updatedService[dateStr] = { fullDay: availDayFullDay, slots: availDayFullDay ? [] : availDaySlots };
         });
         return { ...prev, [availService]: updatedService };
       });
       setAvailSuccess(true);
       setTimeout(() => setAvailSuccess(false), 3000);
     }
   } finally {
     setAvailSaving(false);
   }
 };

 // Vrai changement de mot de passe — même logique que côté propriétaire :
 // Supabase n'a pas de fonction pour "juste vérifier" un mot de passe, donc
 // on tente une reconnexion avec l'ancien avant d'appliquer le nouveau.
 const handleChangePassword = async () => {
   setPasswordError('');
   if (!currentPassword) {
     setPasswordError('Merci de saisir votre mot de passe actuel.');
     return;
   }
   if (newPassword.length < 6) {
     setPasswordError('Le nouveau mot de passe doit contenir au moins 6 caractères.');
     return;
   }
   if (newPassword !== confirmPassword) {
     setPasswordError('Les deux nouveaux mots de passe ne correspondent pas.');
     return;
   }
   setPasswordSaving(true);
   try {
     const { data: { session } } = await supabase.auth.getSession();
     if (!session?.user?.email) {
       setPasswordError('Impossible de vérifier votre compte — reconnectez-vous et réessayez.');
       return;
     }
     const { error: signInError } = await supabase.auth.signInWithPassword({
       email: session.user.email, password: currentPassword,
     });
     if (signInError) {
       setPasswordError('Mot de passe actuel incorrect.');
       return;
     }
     const { error } = await supabase.auth.updateUser({ password: newPassword });
     if (error) {
       setPasswordError("Une erreur est survenue, réessayez.");
       return;
     }
     setCurrentPassword('');
     setNewPassword('');
     setConfirmPassword('');
     setPasswordSuccess(true);
     setTimeout(() => setPasswordSuccess(false), 4000);
   } finally {
     setPasswordSaving(false);
   }
 };

 const displayName = profile
   ? `${profile.first_name || ''}${profile.last_name ? ' ' + profile.last_name.charAt(0) + '.' : ''}`.trim() || 'Promeneur'
   : 'Promeneur';
 const totalWalks = history.length;
 // Note publique = moyenne des notes laissées par les vrais propriétaires
 // (table bookings.owner_rating), pas une note que le promeneur se donnerait.
 const avgRating = clientRatings.length > 0
   ? (clientRatings.reduce((sum, r) => sum + r, 0) / clientRatings.length).toFixed(1)
   : null;
 const ratingLabel = avgRating ? `⭐ ${avgRating}` : '✨ Nouveau';
 const totalMinutes = history.reduce((sum, h) => sum + (h.duration || 0), 0);
 const hoursLabel = totalMinutes > 0 ? `${(totalMinutes / 60).toFixed(1)}h` : '0h';
 const clientCount = new Set(history.map(h => h.owner)).size;

 // Calendrier de l'historique (onglet Gains) : on regroupe les missions par
 // jour pour naviguer par date plutôt que de dérouler une liste sans fin.
 const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
 const missionsByDay = {};
 history.forEach(h => {
   if (!h.createdAt) return;
   const key = dayKey(new Date(h.createdAt));
   (missionsByDay[key] = missionsByDay[key] || []).push(h);
 });
 const calYear = calMonth.getFullYear();
 const calMonthIndex = calMonth.getMonth();
 const calFirstWeekday = (new Date(calYear, calMonthIndex, 1).getDay() + 6) % 7; // lundi = 0
 const calDaysInMonth = new Date(calYear, calMonthIndex + 1, 0).getDate();
 const calCells = [
   ...Array(calFirstWeekday).fill(null),
   ...Array(calDaysInMonth).fill(0).map((_, i) => i + 1),
 ];
 const now = new Date();
 const isSameDay = (d) => d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
 const isSameMonth = (d) => d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
 const todayEarnings = history.filter(h => h.createdAt && isSameDay(new Date(h.createdAt))).reduce((sum, h) => sum + h.price, 0);
 const monthEarnings = history.filter(h => h.createdAt && isSameMonth(new Date(h.createdAt))).reduce((sum, h) => sum + h.price, 0);

 // Calendrier de "Mes disponibilités" — même construction que le calendrier
 // de l'historique ci-dessus, sur son propre mois/sélection.
 const todayKey = dayKey(now);
 const availCalYear = availCalMonth.getFullYear();
 const availCalMonthIndex = availCalMonth.getMonth();
 const availCalFirstWeekday = (new Date(availCalYear, availCalMonthIndex, 1).getDay() + 6) % 7;
 const availCalDaysInMonth = new Date(availCalYear, availCalMonthIndex + 1, 0).getDate();
 const availCalCells = [
   ...Array(availCalFirstWeekday).fill(null),
   ...Array(availCalDaysInMonth).fill(0).map((_, i) => i + 1),
 ];

 // Chercher une vraie demande de balade en attente pendant qu'on est disponible
 useEffect(() => {
   if (!available || phase !== 'idle' || !walkerId) return;
   let cancelled = false;
   const checkForMission = async () => {
     const { data } = await supabase
       .from('bookings')
       .select('*')
       .eq('walker_id', walkerId)
       .eq('status', 'pending')
       // Les demandes planifiées à l'avance ont leur propre écran, sans
       // alerte 60s — voir "Demandes planifiées" plus bas.
       .eq('is_scheduled', false)
       .order('created_at', { ascending: true })
       .limit(1);
     if (cancelled || !data || data.length === 0) return;
     const b = data[0];
     setMission({
       bookingId: b.id,
       owner: b.owner_name || 'Propriétaire',
       ownerPhoto: b.owner_photo_url,
       dog: b.dog_name || 'Chien',
       dogBreed: b.dog_breed || '',
       dogSize: b.dog_size || 'm',
       dogPhoto: b.dog_photo_url,
       service: b.service,
       duration: b.duration,
       price: Number(b.price),
       address: b.address || 'Adresse communiquée après acceptation',
       distance: b.distance_km != null ? `${b.distance_km} km` : 'proximité inconnue',
       instructions: b.instructions,
     });
     setMissionTimer(MISSION_TIMER_SECONDS);
     setPhase('mission_incoming');
   };
   checkForMission();
   const interval = setInterval(checkForMission, 4000);
   return () => { cancelled = true; clearInterval(interval); };
 }, [available, phase, walkerId]);

 // Demandes de balades planifiées à l'avance : indépendant du bouton
 // "disponible" (ce n'est pas "maintenant") — on regarde à la fois celles en
 // attente de réponse et celles déjà confirmées (pour proposer de les
 // démarrer une fois le jour arrivé).
 useEffect(() => {
   if (!walkerId) return;
   let cancelled = false;
   const loadScheduled = async () => {
     const { data: pending } = await supabase
       .from('bookings').select('*')
       .eq('walker_id', walkerId).eq('status', 'pending').eq('is_scheduled', true)
       .order('scheduled_date', { ascending: true });
     if (!cancelled) setScheduledRequests(pending || []);
     const { data: confirmed } = await supabase
       .from('bookings').select('*')
       .eq('walker_id', walkerId).eq('status', 'accepted').eq('is_scheduled', true)
       .order('scheduled_date', { ascending: true });
     // On exclut la mission qu'on vient de démarrer (bouton "Démarrer") :
     // en base elle reste "accepted" jusqu'à la remise du chien, sinon elle
     // réapparaîtrait ici en double à côté de son suivi en direct.
     if (!cancelled) setConfirmedScheduled((confirmed || []).filter(b => b.id !== mission?.bookingId));
   };
   loadScheduled();
   const interval = setInterval(loadScheduled, 6000);
   return () => { cancelled = true; clearInterval(interval); };
 }, [walkerId, mission?.bookingId]);

 // Discussion avant décision, pour une demande planifiée pas encore
 // acceptée/refusée — même table que la discussion de mission, fil séparé.
 const loadReqChat = useCallback(async (bookingId) => {
   const { data } = await supabase
     .from('booking_messages').select('*').eq('booking_id', bookingId)
     .order('created_at', { ascending: true });
   setReqChatMessages(data || []);
 }, []);

 useEffect(() => {
   if (!reqChatBooking?.id) return;
   loadReqChat(reqChatBooking.id);
   const interval = setInterval(() => loadReqChat(reqChatBooking.id), 4000);
   return () => clearInterval(interval);
 }, [reqChatBooking?.id, loadReqChat]);

 const sendReqMessage = async () => {
   const text = reqChatInput.trim();
   if (!text || !reqChatBooking?.id || !walkerId) return;
   setReqChatInput('');
   await supabase.from('booking_messages').insert({
     booking_id: reqChatBooking.id, sender_id: walkerId, kind: 'text', text,
   });
   loadReqChat(reqChatBooking.id);
 };

 const respondScheduledRequest = async (booking, decision) => {
   setScheduledActionLoading(booking.id);
   try {
     const updates = decision === 'accepted'
       ? { status: 'accepted', walker_name: displayName, walker_rating: avgRating ? Number(avgRating) : null, walker_total_walks: totalWalks }
       : { status: 'refused' };
     await supabase.from('bookings').update(updates).eq('id', booking.id);
     setScheduledRequests(prev => prev.filter(b => b.id !== booking.id));
     if (decision === 'accepted') setConfirmedScheduled(prev => [...prev, { ...booking, status: 'accepted' }]);
     if (reqChatBooking?.id === booking.id) setReqChatBooking(null);
   } finally {
     setScheduledActionLoading(null);
   }
 };

 // Le jour J est arrivé : on démarre vraiment la mission — exactement comme
 // pour une mission immédiate acceptée (position partagée, suivi en direct).
 const startScheduledMission = (booking) => {
   setMission({
     bookingId: booking.id,
     owner: booking.owner_name || 'Propriétaire',
     ownerPhoto: booking.owner_photo_url,
     dog: booking.dog_name || 'Chien',
     dogBreed: booking.dog_breed || '',
     dogSize: booking.dog_size || 'm',
     dogPhoto: booking.dog_photo_url,
     service: booking.service,
     duration: booking.duration,
     price: Number(booking.price),
     address: booking.address || 'Adresse communiquée après acceptation',
     distance: booking.distance_km != null ? `${booking.distance_km} km` : 'proximité inconnue',
     instructions: booking.instructions,
   });
   if (walkerId) supabase.from('walker_profiles').update({ available: false }).eq('id', walkerId);
   setAvailable(false);
   setPhase('navigating');
   setTab('mission');
   setConfirmedScheduled(prev => prev.filter(b => b.id !== booking.id));
 };

 // Surveiller la réservation en cours : passer à la balade une fois que
 // le propriétaire confirme la remise du chien, et — surtout — détecter
 // si le propriétaire annule pendant qu'on est en route ou en attente.
 useEffect(() => {
   if (!mission?.bookingId || !['navigating', 'arrived', 'walking', 'returning', 'pickup_photo', 'return_photo'].includes(phase)) return;
   let stopped = false;
   const checkBooking = async () => {
     const { data } = await supabase
       .from('bookings').select('status').eq('id', mission.bookingId).single();
     if (stopped || !data) return;
     if (data.status === 'cancelled') {
       clearInterval(walkerTimerRef.current);
       setPhase('idle');
       setMission(null);
       setWalkTime(0);
       mapInstanceRef.current = null;
       setShowCancelledNotice(true);
       if (walkerId) {
         await supabase.from('walker_profiles').update({ available: true }).eq('id', walkerId);
       }
       setAvailable(true);
     } else if (phase === 'arrived' && data.status === 'walking') {
       setWalkTime(0);
       mapInstanceRef.current = null;
       // Avant de démarrer vraiment, une photo du chien à la prise en
       // charge est obligatoire — comme une preuve d'état des lieux.
       setPhase('pickup_photo');
     } else if (phase === 'returning' && data.status === 'completed') {
       // Le propriétaire a confirmé avoir récupéré son chien — la balade
       // est vraiment terminée, on peut passer à la notation.
       setShowRating(true);
     } else if (phase === 'returning' && data.status === 'incident') {
       // Le propriétaire signale ne pas avoir récupéré son chien — on
       // arrête le chrono mais on ne referme rien tout seul le temps que
       // ce soit vu et traité.
       clearInterval(walkerTimerRef.current);
       setShowIncidentNotice(true);
     }
   };
   checkBooking();
   const interval = setInterval(checkBooking, 3000);
   return () => { stopped = true; clearInterval(interval); };
 }, [phase, mission, walkerId]);

 // Vraie discussion avec le propriétaire pendant la mission (texte, photos,
 // et petites notifs "pipi/caca") — un seul fil, partagé avec le vrai
 // propriétaire, plus de fausses réponses automatiques.
 const loadMessages = useCallback(async () => {
   if (!mission?.bookingId) return;
   const { data } = await supabase
     .from('booking_messages').select('*').eq('booking_id', mission.bookingId)
     .order('created_at', { ascending: true });
   if (data) setMessages(data);
 }, [mission?.bookingId]);

 useEffect(() => {
   if (!mission?.bookingId || !['navigating', 'arrived', 'walking', 'returning', 'pickup_photo', 'return_photo'].includes(phase)) {
     setMessages([]);
     return;
   }
   loadMessages();
   const interval = setInterval(loadMessages, 4000);
   return () => clearInterval(interval);
 }, [mission?.bookingId, phase, loadMessages]);

 useEffect(() => {
   if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
 }, [messages, showChat]);

 // Aide & Support. Les demandes vivent dans support_tickets : chacun ne voit
 // que les siennes (RLS), et la réponse écrite côté Supabase revient dans
 // "Mes demandes" — pas d'espace admin dans l'app.
 const loadSupport = async () => {
   if (!walkerId) return;
   setSupportLoading(true);
   const { data } = await supabase
     .from('support_tickets').select('*').eq('user_id', walkerId)
     .order('created_at', { ascending: false }).limit(20);
   setSupportTickets(data || []);
   setSupportLoading(false);
 };

 // bookingId facultatif : renseigné quand on arrive depuis une mission précise.
 const openSupportTab = (bookingId) => {
   setTab('support');
   setSupportSent(false);
   setSupportError('');
   if (bookingId) setSupportForm(f => ({ ...f, bookingId, subject: 'Problème sur une balade' }));
   loadSupport();
 };

 const sendSupportTicket = async () => {
   const message = supportForm.message.trim();
   if (!supportForm.subject) { setSupportError('Choisissez un sujet'); return; }
   if (message.length < 10) { setSupportError('Décrivez votre demande en quelques mots'); return; }
   setSupportError('');
   setSupportSending(true);
   const { error } = await supabase.from('support_tickets').insert({
     user_id: walkerId,
     role: 'walker',
     booking_id: supportForm.bookingId || null,
     subject: supportForm.subject,
     message,
   });
   setSupportSending(false);
   if (error) { setSupportError("L'envoi a échoué — réessayez"); return; }
   setSupportForm({ subject: '', bookingId: '', message: '' });
   setSupportSent(true);
   loadSupport();
 };

 // Consulter l'historique (messages + photos) d'une mission déjà terminée —
 // en lecture seule, pour retrouver une conversation ou une preuve photo.
 const openHistoryChat = async (h) => {
   if (!h.bookingId) return;
   setHistoryChat({ bookingId: h.bookingId, owner: h.owner, dog: h.dog, date: h.date });
   setHistoryLoading(true);
   setHistoryMessages([]);
   const { data } = await supabase
     .from('booking_messages').select('*').eq('booking_id', h.bookingId)
     .order('created_at', { ascending: true });
   setHistoryMessages(data || []);
   setHistoryLoading(false);
 };

 const sendMessage = async () => {
   const text = newMessage.trim();
   if (!text || !mission?.bookingId || !walkerId) return;
   setNewMessage('');
   await supabase.from('booking_messages').insert({
     booking_id: mission.bookingId, sender_id: walkerId, kind: 'text', text,
   });
   loadMessages();
 };

 // Boutons "pipi / caca" — une notification sympa envoyée dans le fil,
 // pour prévenir le propriétaire sans avoir à taper un message.
 const sendPottyEvent = async (type) => {
   if (!mission?.bookingId || !walkerId) return;
   const text = type === 'pee' ? `💦 ${mission.dog} vient de faire pipi !` : `💩 ${mission.dog} vient de faire caca !`;
   await supabase.from('booking_messages').insert({
     booking_id: mission.bookingId, sender_id: walkerId, kind: 'event', text,
   });
   loadMessages();
 };

 // Partager sa position pendant qu'on est disponible, pour qu'on ne nous
 // envoie pas des demandes à l'autre bout de la ville
 useEffect(() => {
   if (!available) { setLocationStatus('idle'); return; }
   if (!walkerId) return;
   if (!navigator.geolocation) { setLocationStatus('unsupported'); return; }
   setLocationStatus('pending');
   const shareLocation = () => {
     navigator.geolocation.getCurrentPosition(
       async (pos) => {
         const { error } = await supabase.from('walker_profiles').update({
           lat: pos.coords.latitude,
           lng: pos.coords.longitude,
           location_updated_at: new Date().toISOString(),
         }).eq('id', walkerId);
         if (error) {
           console.error('Échec de sauvegarde de la position :', error);
           setLocationStatus('error');
         } else {
           setLocationStatus('shared');
         }
       },
       () => { setLocationStatus('denied'); },
       { timeout: 10000 }
     );
   };
   shareLocation();
   const interval = setInterval(shareLocation, 120000);
   return () => clearInterval(interval);
 }, [available, walkerId]);

 // Partager sa position EN DIRECT sur la réservation en cours pendant une
 // mission active, pour que le propriétaire puisse suivre la balade en
 // temps réel de son côté (bien plus fréquent que le partage "disponible").
 useEffect(() => {
   if (!mission?.bookingId || !['navigating', 'arrived', 'walking', 'returning', 'pickup_photo', 'return_photo'].includes(phase)) return;
   if (!navigator.geolocation) return;
   let stopped = false;
   const shareLiveLocation = () => {
     navigator.geolocation.getCurrentPosition(
       async (pos) => {
         if (stopped) return;
         await supabase.from('bookings').update({
           walker_lat: pos.coords.latitude,
           walker_lng: pos.coords.longitude,
           walker_location_updated_at: new Date().toISOString(),
         }).eq('id', mission.bookingId);
       },
       () => {},
       { timeout: 10000 }
     );
   };
   shareLiveLocation();
   const interval = setInterval(shareLiveLocation, 10000);
   return () => { stopped = true; clearInterval(interval); };
 }, [mission, phase]);

 // Timer mission
 useEffect(() => {
   if (phase !== 'mission_incoming') return;
   missionTimerRef.current = setInterval(() => {
     setMissionTimer(t => {
       if (t <= 1) {
         clearInterval(missionTimerRef.current);
         if (mission?.bookingId) {
           supabase.from('bookings').update({ status: 'refused' }).eq('id', mission.bookingId);
         }
         setPhase('idle');
         setMission(null);
         return MISSION_TIMER_SECONDS;
       }
       return t - 1;
     });
   }, 1000);
   return () => clearInterval(missionTimerRef.current);
 }, [phase, mission]);

 // Timer balade
 useEffect(() => {
   if (phase !== 'walking') return;
   walkerTimerRef.current = setInterval(() => setWalkTime(s => s + 1), 1000);
   return () => clearInterval(walkerTimerRef.current);
 }, [phase]);

 // Init carte
 const initNavMap = useCallback(() => {
   if (!mapRef.current || !window.google) return;
   if (mapInstanceRef.current) return;

   mapRef.current.style.height = '240px';
   mapRef.current.style.width = '100%';

   const destination = { lat: 48.8566, lng: 2.3522 };
   const origin = { lat: 48.8590, lng: 2.3550 };

   const map = new window.google.maps.Map(mapRef.current, {
     center: origin, zoom: 15, disableDefaultUI: true,
     styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }]
   });
   mapInstanceRef.current = map;

   setTimeout(() => {
     window.google.maps.event.trigger(map, 'resize');
     map.setCenter(origin);
   }, 200);

   new window.google.maps.Marker({
     position: destination, map,
     icon: { url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png', scaledSize: new window.google.maps.Size(40, 40) },
     title: 'Client'
   });
   new window.google.maps.Marker({
     position: origin, map,
     icon: { url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png', scaledSize: new window.google.maps.Size(40, 40) },
     title: 'Vous'
   });

   const directionsService = new window.google.maps.DirectionsService();
   const directionsRenderer = new window.google.maps.DirectionsRenderer({
     map, suppressMarkers: true,
     polylineOptions: { strokeColor: '#1D9E75', strokeWeight: 4 }
   });
   directionsService.route({
     origin, destination,
     travelMode: window.google.maps.TravelMode.WALKING,
   }, (result, status) => {
     if (status === 'OK') directionsRenderer.setDirections(result);
   });
 }, []);

 useEffect(() => {
   if (phase === 'navigating' || phase === 'walking') {
     mapInstanceRef.current = null;
     setTimeout(initNavMap, 500);
   }
 }, [phase, initNavMap]);

 const acceptMission = async () => {
   clearInterval(missionTimerRef.current);
   if (mission?.bookingId) {
     // On enregistre qui on est directement sur la réservation : le
     // propriétaire pourra ainsi voir un vrai nom/note sans qu'on ait
     // besoin de lui ouvrir l'accès à la fiche complète du promeneur.
     await supabase.from('bookings').update({
       status: 'accepted',
       walker_name: displayName,
       walker_rating: avgRating ? Number(avgRating) : null,
       walker_total_walks: totalWalks,
     }).eq('id', mission.bookingId);
   }
   if (walkerId) {
     await supabase.from('walker_profiles').update({ available: false }).eq('id', walkerId);
   }
   setAvailable(false);
   setPhase('navigating');
   setTab('mission');
 };

 const refuseMission = async () => {
   clearInterval(missionTimerRef.current);
   if (mission?.bookingId) {
     await supabase.from('bookings').update({ status: 'refused' }).eq('id', mission.bookingId);
   }
   setPhase('idle');
   setMission(null);
 };

 // Le promeneur annule une mission déjà acceptée (empêchement, etc.) —
 // le propriétaire doit en être informé, pas laissé sans nouvelles.
 const cancelActiveMission = async () => {
   if (!window.confirm('Annuler cette balade ? Le propriétaire en sera informé.')) return;
   clearInterval(walkerTimerRef.current);
   if (mission?.bookingId) {
     await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', mission.bookingId);
   }
   if (walkerId) {
     await supabase.from('walker_profiles').update({ available: true }).eq('id', walkerId);
   }
   setAvailable(true);
   setPhase('idle');
   setMission(null);
   setWalkTime(0);
   mapInstanceRef.current = null;
 };

 // Le propriétaire n'a pas confirmé avoir récupéré son chien — on ne remet
 // pas le promeneur "disponible" tant qu'il n'a pas vu et fermé ce message,
 // pour ne pas lui envoyer une nouvelle mission en pleine situation
 // litigieuse.
 const dismissIncidentNotice = async () => {
   setShowIncidentNotice(false);
   if (walkerId) {
     await supabase.from('walker_profiles').update({ available: true }).eq('id', walkerId);
   }
   setAvailable(true);
   setPhase('idle');
   setMission(null);
   setWalkTime(0);
   mapInstanceRef.current = null;
 };

 // On signale son arrivée, mais la balade ne démarre pour de vrai que
 // quand le propriétaire confirme lui avoir remis son chien.
 const confirmArrival = async () => {
   setPhase('arrived');
   if (mission?.bookingId) {
     await supabase.from('bookings').update({ status: 'walker_arrived' }).eq('id', mission.bookingId);
   }
 };

 // Photo prise sur le moment (l'attribut "capture" force l'appareil photo
 // plutôt que la pioche dans d'anciennes photos), envoyée dans le fil de
 // discussion pour que le propriétaire la voie tout de suite.
 // kind: 'photo' (envoi libre pendant la balade), 'handover_photo' (preuve
 // à la prise en charge) ou 'return_photo' (preuve au retour) — un peu
 // comme l'état des lieux photo des apps de location.
 const handlePhoto = async (e, kind = 'photo') => {
   const file = e.target.files[0];
   e.target.value = '';
   if (!file || !mission?.bookingId || !walkerId) return;
   setSendingPhoto(true);
   try {
     const path = `${mission.bookingId}/${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`;
     const { error: uploadError } = await supabase.storage.from('walk-photos').upload(path, file, {
       contentType: file.type || 'image/jpeg',
     });
     if (uploadError) { console.error(uploadError); return; }
     const { data: pub } = supabase.storage.from('walk-photos').getPublicUrl(path);
     await supabase.from('booking_messages').insert({
       booking_id: mission.bookingId, sender_id: walkerId, kind, image_url: pub.publicUrl,
     });
     loadMessages();
     if (kind === 'handover_photo') setPhase('walking');
     if (kind === 'return_photo') await finalizeReturn();
   } finally {
     setSendingPhoto(false);
   }
 };

 // Terminer la balade ne clôt plus la réservation tout seul — une photo de
 // preuve au retour est d'abord obligatoire (voir handlePhoto), puis le
 // propriétaire doit confirmer avoir bien récupéré son chien, exactement
 // comme il a fallu confirmer la remise au départ.
 const endWalk = () => {
   setPhase('return_photo');
 };

 const finalizeReturn = async () => {
   clearInterval(walkerTimerRef.current);
   if (mission?.bookingId) {
     await supabase.from('bookings').update({
       status: 'walker_returning',
       walk_ended_at: new Date().toISOString(),
     }).eq('id', mission.bookingId);
   }
   setPhase('returning');
 };

 const submitRating = async () => {
   const { data: { session } } = await supabase.auth.getSession();
   if (session && mission) {
     const { data: inserted } = await supabase
       .from('walks')
       .insert({
         walker_id: session.user.id,
         owner_name: mission.owner,
         dog_name: mission.dog,
         service: mission.service,
         duration: mission.duration,
         price: mission.price,
         rating,
         booking_id: mission.bookingId || null,
       })
       .select()
       .single();
     if (inserted) {
       setHistory(h => [{
         id: inserted.id,
         owner: inserted.owner_name,
         dog: inserted.dog_name,
         service: inserted.service,
         duration: inserted.duration,
         price: Number(inserted.price),
         rating: inserted.rating,
         date: new Date(inserted.created_at).toLocaleDateString('fr-FR'),
         createdAt: inserted.created_at,
         bookingId: inserted.booking_id,
       }, ...h]);
     }
     if (mission.bookingId) {
       await supabase.from('bookings').update({ status: 'completed' }).eq('id', mission.bookingId);
     }
     await supabase.from('walker_profiles').update({ available: true }).eq('id', session.user.id);
     setAvailable(true);
   }
   setShowRating(false);
   setPhase('idle');
   setMission(null);
   setRating(0);
   setWalkTime(0);
   mapInstanceRef.current = null;
   setTab('home');
 };

 const formatTime = (s) => {
   const m = Math.floor(s / 60);
   const sec = s % 60;
   return `${m}:${sec.toString().padStart(2, '0')}`;
 };

 const progressPct = mission ? Math.min(100, (walkTime / (mission.duration * 60)) * 100) : 0;

 if (profileLoading) {
   return (
     <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
       <div style={{ fontSize: 48 }}>🐾</div>
     </div>
   );
 }

 return (
   <div style={{ minHeight: '100vh', background: '#F8FAF9', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", maxWidth: 430, margin: '0 auto', paddingBottom: 80 }}>
     <style>{`
       @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.5} }
       @keyframes slidein { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
       @keyframes ring { 0%{transform:scale(1)}50%{transform:scale(1.08)}100%{transform:scale(1)} }
     `}</style>

     {/* MODAL MISSION ENTRANTE */}
     {phase === 'mission_incoming' && mission && (
       <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
         <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '28px 24px 40px', width: '100%', maxWidth: 430, animation: 'slidein 0.3s ease' }}>
           <div style={{ textAlign: 'center', marginBottom: 20 }}>
             <div style={{ width: 64, height: 64, borderRadius: '50%', background: missionTimer > MISSION_TIMER_SECONDS / 2 ? '#E1F5EE' : '#FFF0F0', border: `4px solid ${missionTimer > MISSION_TIMER_SECONDS / 2 ? '#1D9E75' : '#E24B4A'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', animation: 'ring 1s infinite', fontSize: 22, fontWeight: 700, color: missionTimer > MISSION_TIMER_SECONDS / 2 ? '#1D9E75' : '#E24B4A' }}>
               {missionTimer}s
             </div>
             <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>Nouvelle mission !</div>
             <div style={{ fontSize: 13, color: '#888' }}>Répondez avant la fin du timer</div>
           </div>

           <div style={{ background: '#F8FAF9', borderRadius: 16, padding: '16px', marginBottom: 16 }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
               <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
                 {SIZE_ICONS[mission.dogSize] || '🐕'}
               </div>
               <div style={{ flex: 1 }}>
                 <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>{mission.dog} · {mission.dogBreed}</div>
                 <div style={{ fontSize: 13, color: '#888' }}>Propriétaire : {mission.owner}</div>
               </div>
               <div style={{ textAlign: 'center', background: '#E1F5EE', borderRadius: 12, padding: '8px 14px' }}>
                 <div style={{ fontSize: 20, fontWeight: 700, color: '#1D9E75' }}>{mission.price}€</div>
                 <div style={{ fontSize: 11, color: '#888' }}>{mission.duration} min</div>
               </div>
             </div>
             <div style={{ height: 1, background: '#EBEBEB', marginBottom: 10 }} />
             <div style={{ fontSize: 13, color: '#555', marginBottom: 4 }}>📍 {mission.address}</div>
             <div style={{ fontSize: 13, color: '#1D9E75', fontWeight: 600, marginBottom: 4 }}>🚶 À {mission.distance} de vous</div>
             {mission.instructions && (
               <div style={{ fontSize: 12, color: '#888', background: '#FFF8E1', borderRadius: 8, padding: '6px 10px', marginTop: 8 }}>
                 💬 {mission.instructions}
               </div>
             )}
           </div>

           <button onClick={acceptMission}
             style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', marginBottom: 10, boxShadow: '0 4px 16px rgba(29,158,117,0.4)' }}>
             ✅ Accepter la mission — {mission.price}€
           </button>
           <button onClick={refuseMission}
             style={{ width: '100%', padding: 13, background: 'transparent', color: '#E24B4A', border: '1.5px solid #E24B4A', borderRadius: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
             ❌ Refuser
           </button>
         </div>
       </div>
     )}

     {/* DISCUSSION AVEC LE PROPRIÉTAIRE */}
     {showChat && mission && (
       <div style={{ position: 'fixed', inset: 0, background: '#F8FAF9', zIndex: 400, display: 'flex', flexDirection: 'column', maxWidth: 430, margin: '0 auto' }}>
         <div style={{ background: 'linear-gradient(160deg, #0F6E56, #1D9E75)', padding: '48px 20px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
           <button onClick={() => setShowChat(false)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 10, padding: '8px 14px', fontSize: 14, cursor: 'pointer' }}>← Retour</button>
           <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{mission.ownerPhoto ? <img src={mission.ownerPhoto} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : '👤'}</div>
           <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{mission.owner}</div>
         </div>
         <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
           {messages.length === 0 && (
             <div style={{ textAlign: 'center', color: '#AAA', fontSize: 13, marginTop: 20 }}>Aucun message pour l'instant</div>
           )}
           {messages.map(msg => (
             msg.kind === 'event' ? (
               <div key={msg.id} style={{ alignSelf: 'center', background: '#FFF8E1', color: '#B8860B', borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 600 }}>{msg.text}</div>
             ) : (msg.kind === 'photo' || msg.kind === 'handover_photo' || msg.kind === 'return_photo') ? (
               <div key={msg.id} style={{ alignSelf: msg.sender_id === walkerId ? 'flex-end' : 'flex-start' }}>
                 {msg.kind !== 'photo' && (
                   <div style={{ fontSize: 11, color: '#888', marginBottom: 4, textAlign: msg.sender_id === walkerId ? 'right' : 'left' }}>
                     {msg.kind === 'handover_photo' ? '📸 Photo à la prise en charge' : '📸 Photo au retour'}
                   </div>
                 )}
                 <img src={msg.image_url} alt="balade" style={{ width: 180, height: 180, borderRadius: 14, objectFit: 'cover' }} />
               </div>
             ) : (
               <div key={msg.id} style={{ display: 'flex', justifyContent: msg.sender_id === walkerId ? 'flex-end' : 'flex-start' }}>
                 <div style={{ maxWidth: '75%', background: msg.sender_id === walkerId ? '#1D9E75' : '#fff', color: msg.sender_id === walkerId ? '#fff' : '#1A1A1A', borderRadius: msg.sender_id === walkerId ? '18px 18px 4px 18px' : '18px 18px 18px 4px', padding: '10px 14px', fontSize: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                   {msg.text}
                 </div>
               </div>
             )
           ))}
           <div ref={chatEndRef} />
         </div>
         <div style={{ padding: '12px 16px', background: '#fff', borderTop: '1px solid #F0F0F0', display: 'flex', gap: 10, alignItems: 'center' }}>
           <input style={{ flex: 1, padding: '12px 14px', borderRadius: 24, border: '1.5px solid #E8E8E8', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#FAFAFA' }}
             placeholder="Écrire un message..." value={newMessage}
             onChange={e => setNewMessage(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendMessage()} />
           <button onClick={sendMessage} style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>➤</button>
         </div>
       </div>
     )}

     {/* HISTORIQUE D'UNE MISSION PASSÉE : conversation + photos, lecture seule */}
     {historyChat && (
       <div style={{ position: 'fixed', inset: 0, background: '#F8FAF9', zIndex: 400, display: 'flex', flexDirection: 'column', maxWidth: 430, margin: '0 auto' }}>
         <div style={{ background: 'linear-gradient(160deg, #0F6E56, #1D9E75)', padding: '48px 20px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
           <button onClick={() => setHistoryChat(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 10, padding: '8px 14px', fontSize: 14, cursor: 'pointer' }}>← Retour</button>
           <div>
             <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{historyChat.dog} · {historyChat.owner}</div>
             <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>{historyChat.date} · historique</div>
           </div>
           <button onClick={() => { const id = historyChat.bookingId; setHistoryChat(null); openSupportTab(id); }}
             style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 10, padding: '8px 12px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
             ⚠️ Signaler
           </button>
         </div>
         <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
           {historyLoading ? (
             <div style={{ textAlign: 'center', color: '#AAA', fontSize: 13, marginTop: 20 }}>Chargement...</div>
           ) : historyMessages.length === 0 ? (
             <div style={{ textAlign: 'center', color: '#AAA', fontSize: 13, marginTop: 20 }}>Aucun message pour cette mission</div>
           ) : historyMessages.map(msg => (
             msg.kind === 'event' ? (
               <div key={msg.id} style={{ alignSelf: 'center', background: '#FFF8E1', color: '#B8860B', borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 600 }}>{msg.text}</div>
             ) : (msg.kind === 'photo' || msg.kind === 'handover_photo' || msg.kind === 'return_photo') ? (
               <div key={msg.id} style={{ alignSelf: msg.sender_id === walkerId ? 'flex-end' : 'flex-start' }}>
                 {msg.kind !== 'photo' && (
                   <div style={{ fontSize: 11, color: '#888', marginBottom: 4, textAlign: msg.sender_id === walkerId ? 'right' : 'left' }}>
                     {msg.kind === 'handover_photo' ? '📸 Photo à la prise en charge' : '📸 Photo au retour'}
                   </div>
                 )}
                 <img src={msg.image_url} alt="balade" style={{ width: 180, height: 180, borderRadius: 14, objectFit: 'cover' }} />
               </div>
             ) : (
               <div key={msg.id} style={{ display: 'flex', justifyContent: msg.sender_id === walkerId ? 'flex-end' : 'flex-start' }}>
                 <div style={{ maxWidth: '75%', background: msg.sender_id === walkerId ? '#1D9E75' : '#fff', color: msg.sender_id === walkerId ? '#fff' : '#1A1A1A', borderRadius: msg.sender_id === walkerId ? '18px 18px 4px 18px' : '18px 18px 18px 4px', padding: '10px 14px', fontSize: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                   {msg.text}
                 </div>
               </div>
             )
           ))}
         </div>
         <div style={{ padding: '14px 16px', background: '#fff', borderTop: '1px solid #F0F0F0', textAlign: 'center', fontSize: 12, color: '#AAA' }}>
           Mission terminée — historique en lecture seule
         </div>
       </div>
     )}

     {/* MODAL SIGNALEMENT : LE PROPRIÉTAIRE N'A PAS RÉCUPÉRÉ SON CHIEN */}
     {showIncidentNotice && (
       <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 350, padding: 24 }}>
         <div style={{ background: '#fff', borderRadius: 20, padding: '28px 24px', width: '100%', maxWidth: 360, textAlign: 'center', border: '2px solid #E24B4A' }}>
           <div style={{ fontSize: 44, marginBottom: 12 }}>🚨</div>
           <h3 style={{ fontSize: 17, fontWeight: 700, color: '#E24B4A', marginBottom: 8 }}>Signalement du propriétaire</h3>
           <p style={{ fontSize: 13, color: '#555', marginBottom: 12 }}>{mission?.owner || 'Le propriétaire'} indique ne pas avoir récupéré {mission?.dog || 'son chien'}. Contactez-le tout de suite via la discussion pour clarifier la situation.</p>
           <p style={{ fontSize: 12, color: '#888', marginBottom: 20 }}>Cette réservation reste ouverte tant que ce n'est pas résolu — vous ne recevrez pas de nouvelle mission d'ici là.</p>
           <button onClick={dismissIncidentNotice}
             style={{ width: '100%', padding: 14, background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
             J'ai compris
           </button>
         </div>
       </div>
     )}

     {/* MODAL BALADE ANNULÉE PAR LE PROPRIÉTAIRE */}
     {showCancelledNotice && (
       <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 24 }}>
         <div style={{ background: '#fff', borderRadius: 20, padding: '28px 24px', width: '100%', maxWidth: 360, textAlign: 'center' }}>
           <div style={{ fontSize: 44, marginBottom: 12 }}>😕</div>
           <h3 style={{ fontSize: 17, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>Balade annulée</h3>
           <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Le propriétaire a annulé cette balade. Vous êtes de nouveau disponible pour recevoir des missions.</p>
           <button onClick={() => setShowCancelledNotice(false)}
             style={{ width: '100%', padding: 14, background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
             OK
           </button>
         </div>
       </div>
     )}

     {/* MODAL NOTATION */}
     {showRating && (
       <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
         <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '28px 24px 40px', width: '100%', maxWidth: 430 }}>
           <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1A1A1A', marginBottom: 4, textAlign: 'center' }}>Balade terminée ! 🎉</h3>
           <p style={{ fontSize: 14, color: '#888', marginBottom: 20, textAlign: 'center' }}>Notez votre expérience avec {mission?.owner}</p>
           <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
             {[1,2,3,4,5].map(s => (
               <div key={s} onClick={() => setRating(s)}
                 style={{ fontSize: 36, cursor: 'pointer', filter: s <= rating ? 'none' : 'grayscale(1)', transition: 'all 0.2s', transform: s <= rating ? 'scale(1.2)' : 'scale(1)' }}>
                 ⭐
               </div>
             ))}
           </div>
           <div style={{ background: '#E1F5EE', borderRadius: 12, padding: '16px', marginBottom: 20, textAlign: 'center' }}>
             <div style={{ fontSize: 28, fontWeight: 700, color: '#1D9E75' }}>+{mission?.price}€</div>
             <div style={{ fontSize: 13, color: '#0F6E56' }}>ajoutés à vos gains</div>
           </div>
           <button onClick={submitRating} disabled={!rating}
             style={{ width: '100%', padding: 16, background: rating ? 'linear-gradient(135deg, #1D9E75, #0F6E56)' : '#F0F0F0', color: rating ? '#fff' : '#AAA', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: rating ? 'pointer' : 'default', fontFamily: 'inherit' }}>
             Terminer et encaisser
           </button>
         </div>
       </div>
     )}

     {/* HEADER */}
     <div style={{ background: 'linear-gradient(160deg, #0F6E56, #1D9E75)', padding: '48px 24px 24px' }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
         <div>
           <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 2 }}>Espace promeneur</p>
           <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>{displayName} 🐾</h1>
         </div>
         <div style={{ textAlign: 'right' }}>
           <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{todayEarnings}€</div>
           <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>gains aujourd'hui</div>
         </div>
       </div>

       {/* Toggle */}
       <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
         <div>
           <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
             {available ? '🟢 Disponible' : '🔴 Indisponible'}
           </div>
           <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
             {available ? 'Vous recevez des missions' : 'Activez pour recevoir des missions'}
           </div>
         </div>
         <div onClick={async () => {
           const next = !available;
           setAvailable(next);
           if (!next) { setPhase('idle'); setMission(null); }
           if (walkerId) {
             await supabase.from('walker_profiles').update({ available: next }).eq('id', walkerId);
           }
         }}
           style={{ width: 52, height: 28, borderRadius: 14, background: available ? '#fff' : 'rgba(255,255,255,0.3)', cursor: 'pointer', position: 'relative', transition: 'background 0.3s', flexShrink: 0 }}>
           <div style={{ width: 22, height: 22, borderRadius: '50%', background: available ? '#1D9E75' : '#fff', position: 'absolute', top: 3, left: available ? 27 : 3, transition: 'left 0.3s' }} />
         </div>
       </div>

       {available && locationStatus === 'shared' && (
         <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,0.8)', textAlign: 'center' }}>
           📍 Position partagée — vous serez proposé(e) en priorité aux propriétaires proches
         </div>
       )}
       {available && locationStatus === 'pending' && (
         <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,0.8)', textAlign: 'center' }}>
           📍 Demande de position en cours...
         </div>
       )}
       {available && (locationStatus === 'denied' || locationStatus === 'unsupported') && (
         <div style={{ marginTop: 10, fontSize: 12, color: '#FFE9A8', textAlign: 'center' }}>
           ⚠️ Position non partagée — vous recevrez quand même des demandes, mais pas forcément les plus proches
         </div>
       )}
       {available && locationStatus === 'error' && (
         <div style={{ marginTop: 10, fontSize: 12, color: '#FFB3B3', textAlign: 'center' }}>
           ⚠️ Votre position n'a pas pu être enregistrée (erreur technique) — contactez le support
         </div>
       )}

       {available && phase === 'idle' && (
         <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'center', animation: 'pulse 2s infinite' }}>
           🔍 Recherche de missions à proximité...
         </div>
       )}

       {(phase === 'navigating' || phase === 'arrived' || phase === 'walking' || phase === 'returning' || phase === 'pickup_photo' || phase === 'return_photo') && (
         <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
           onClick={() => setTab('mission')}>
           <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7FFFD4', animation: 'pulse 1s infinite' }} />
           <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#fff' }}>
             {phase === 'navigating' ? `🚶 En route vers ${mission?.owner || 'le client'}`
               : phase === 'arrived' ? '⏳ En attente de confirmation'
               : phase === 'pickup_photo' ? '📸 Photo à prendre'
              : phase === 'return_photo' ? '📸 Photo avant le retour'
               : phase === 'returning' ? '🏠 Retour du chien — en attente'
               : `🐾 Balade en cours — ${formatTime(walkTime)}`}
           </div>
           <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>Voir →</div>
         </div>
       )}
     </div>

     {/* TABS */}
     <div style={{ display: 'flex', background: '#fff', borderBottom: '1px solid #F0F0F0' }}>
       {[
         { id: 'home',    label: '🏠 Accueil' },
         { id: 'mission', label: '🐾 Mission' },
         { id: 'gains',   label: '💶 Gains' },
         { id: 'profile', label: '👤 Profil' },
       ].map(t => (
         <button key={t.id} onClick={() => setTab(t.id)}
           style={{ flex: 1, padding: '12px 4px', border: 'none', background: 'transparent', fontSize: 11, fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? '#1D9E75' : '#888', borderBottom: tab === t.id ? '2px solid #1D9E75' : '2px solid transparent', cursor: 'pointer', fontFamily: 'inherit' }}>
           {t.label}
         </button>
       ))}
     </div>

     <div style={{ padding: '20px' }}>

       {/* ACCUEIL */}
       {tab === 'home' && (
         <div style={{ animation: 'slidein 0.3s ease' }}>
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
             {[
               { label: "Aujourd'hui", value: `${todayEarnings}€`, icon: '💶' },
               { label: 'Ce mois', value: `${monthEarnings}€`, icon: '📅' },
               { label: 'Balades', value: String(totalWalks), icon: '🐾' },
             ].map(s => (
               <div key={s.label} style={{ background: '#fff', borderRadius: 14, padding: '14px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                 <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
                 <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>{s.value}</div>
                 <div style={{ fontSize: 10, color: '#888' }}>{s.label}</div>
               </div>
             ))}
           </div>

           {(phase === 'navigating' || phase === 'arrived' || phase === 'walking' || phase === 'returning' || phase === 'pickup_photo' || phase === 'return_photo') && mission && (
             <div style={{ background: '#E1F5EE', borderRadius: 16, padding: '16px', marginBottom: 16, border: '1.5px solid #1D9E75', cursor: 'pointer' }}
               onClick={() => setTab('mission')}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                 <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D9E75', animation: 'pulse 1s infinite', flexShrink: 0 }} />
                 <div style={{ flex: 1 }}>
                   <div style={{ fontSize: 14, fontWeight: 700, color: '#0F6E56' }}>
                     {phase === 'navigating' ? '🚶 En route vers le client'
                       : phase === 'arrived' ? '⏳ En attente de confirmation'
                       : phase === 'pickup_photo' ? '📸 Photo à prendre'
              : phase === 'return_photo' ? '📸 Photo avant le retour'
                       : phase === 'returning' ? '🏠 Retour du chien — en attente de confirmation'
                       : `🐾 Balade en cours — ${formatTime(walkTime)}`}
                   </div>
                   <div style={{ fontSize: 12, color: '#555' }}>{mission.dog} · {mission.owner}</div>
                 </div>
                 <div style={{ fontSize: 13, color: '#1D9E75', fontWeight: 700 }}>Voir →</div>
               </div>
             </div>
           )}

           {(scheduledRequests.length > 0 || confirmedScheduled.length > 0) && (
             <div onClick={() => setTab('requests')}
               style={{ background: '#FFF8E1', borderRadius: 16, padding: '16px', marginBottom: 16, border: '1.5px solid #F59E0B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
               <div style={{ fontSize: 24 }}>📅</div>
               <div style={{ flex: 1 }}>
                 <div style={{ fontSize: 14, fontWeight: 700, color: '#D97706' }}>
                   {scheduledRequests.length > 0 ? `${scheduledRequests.length} demande${scheduledRequests.length > 1 ? 's' : ''} planifiée${scheduledRequests.length > 1 ? 's' : ''} à traiter` : 'Missions planifiées à venir'}
                 </div>
                 <div style={{ fontSize: 12, color: '#888' }}>{confirmedScheduled.length > 0 ? `${confirmedScheduled.length} déjà confirmée${confirmedScheduled.length > 1 ? 's' : ''}` : 'Voir le détail'}</div>
               </div>
               <div style={{ fontSize: 13, color: '#D97706', fontWeight: 700 }}>Voir →</div>
             </div>
           )}

           <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', marginBottom: 12 }}>Dernières missions</h3>
           {history.length === 0 ? (
             <div style={{ textAlign: 'center', padding: '32px 20px', background: '#fff', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
               <div style={{ fontSize: 40, marginBottom: 10 }}>🐾</div>
               <p style={{ fontSize: 14, color: '#888' }}>Activez votre disponibilité pour recevoir vos premières missions !</p>
             </div>
           ) : (
             <>
               {history.slice(0, 5).map(h => (
                 <div key={h.id} onClick={() => h.bookingId && openHistoryChat(h)}
                   style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', marginBottom: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 12, cursor: h.bookingId ? 'pointer' : 'default' }}>
                   <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🐕</div>
                   <div style={{ flex: 1 }}>
                     <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A' }}>{h.dog} · {h.owner}</div>
                     <div style={{ fontSize: 12, color: '#888' }}>{h.date} · {h.duration} min</div>
                     <div style={{ fontSize: 12 }}>{'⭐'.repeat(h.rating)}</div>
                   </div>
                   <div style={{ textAlign: 'right' }}>
                     <div style={{ fontSize: 16, fontWeight: 700, color: '#1D9E75' }}>+{h.price}€</div>
                     {h.bookingId && <div style={{ fontSize: 11, color: '#1D9E75', marginTop: 2 }}>💬 Voir</div>}
                   </div>
                 </div>
               ))}
               {history.length > 5 && (
                 <div onClick={() => setTab('gains')}
                   style={{ textAlign: 'center', padding: '12px', color: '#1D9E75', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                   Voir tout l'historique →
                 </div>
               )}
             </>
           )}
         </div>
       )}

       {/* MISSION */}
       {tab === 'mission' && (
         <div style={{ animation: 'slidein 0.3s ease' }}>
           {!mission || phase === 'idle' ? (
             <div style={{ textAlign: 'center', padding: '48px 20px' }}>
               <div style={{ fontSize: 48, marginBottom: 16 }}>😴</div>
               <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>Aucune mission en cours</h3>
               <p style={{ fontSize: 14, color: '#888' }}>
                 {available ? 'En attente d\'une mission...' : 'Activez votre disponibilité depuis l\'accueil'}
               </p>
             </div>
           ) : (
             <div>
               {/* Carte */}
               <div style={{ position: 'relative', marginBottom: 16 }}>
                 <div ref={mapRef} style={{ height: 240, borderRadius: 18, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', background: '#E8F5F0' }} />
                 <div style={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', background: '#fff', borderRadius: 20, padding: '6px 16px', fontSize: 13, fontWeight: 700, color: '#1D9E75', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', whiteSpace: 'nowrap', zIndex: 10 }}>
                   {phase === 'navigating' ? '🚶 En route vers le client'
                     : phase === 'arrived' ? '⏳ En attente de confirmation'
                     : phase === 'pickup_photo' ? '📸 Photo à prendre'
              : phase === 'return_photo' ? '📸 Photo avant le retour'
                     : phase === 'returning' ? '🏠 Retour du chien'
                     : `🐾 Balade — ${formatTime(walkTime)}`}
                 </div>
               </div>

               {/* Info */}
               <div style={{ background: '#fff', borderRadius: 16, padding: '16px', marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                   <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
                     {SIZE_ICONS[mission.dogSize] || '🐕'}
                   </div>
                   <div style={{ flex: 1 }}>
                     <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A' }}>{mission.dog}</div>
                     <div style={{ fontSize: 13, color: '#888' }}>{mission.dogBreed} · {mission.owner}</div>
                   </div>
                   <div style={{ background: '#E1F5EE', borderRadius: 12, padding: '8px 14px', textAlign: 'center' }}>
                     <div style={{ fontSize: 18, fontWeight: 700, color: '#1D9E75' }}>{mission.price}€</div>
                     <div style={{ fontSize: 11, color: '#888' }}>{mission.duration} min</div>
                   </div>
                 </div>

                 <div style={{ fontSize: 13, color: '#555', marginBottom: 6 }}>📍 {mission.address}</div>
                 {mission.instructions && (
                   <div style={{ fontSize: 12, color: '#888', background: '#FFF8E1', borderRadius: 8, padding: '6px 10px' }}>
                     💬 {mission.instructions}
                   </div>
                 )}

                 {phase === 'walking' && (
                   <div style={{ marginTop: 12 }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#888', marginBottom: 6 }}>
                       <span>Progression</span>
                       <span>{Math.round(progressPct)}% · {formatTime(walkTime)} / {mission.duration} min</span>
                     </div>
                     <div style={{ background: '#F0F0F0', borderRadius: 10, height: 8 }}>
                       <div style={{ width: `${progressPct}%`, background: '#1D9E75', borderRadius: 10, height: 8, transition: 'width 1s linear' }} />
                     </div>
                   </div>
                 )}
               </div>

               {/* Discussion, photos & petites notifs */}
               {['navigating', 'arrived', 'walking', 'returning', 'pickup_photo', 'return_photo'].includes(phase) && (
                 <div style={{ background: '#fff', borderRadius: 16, padding: '16px', marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                   <button onClick={() => setShowChat(true)}
                     style={{ width: '100%', padding: '11px', background: '#E1F5EE', color: '#0F6E56', border: '1.5px solid #1D9E75', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: phase === 'walking' ? 12 : 0, fontFamily: 'inherit' }}>
                     💬 Discuter avec {mission.owner} {messages.length > 0 && <span style={{ marginLeft: 8, background: '#1D9E75', color: '#fff', borderRadius: 10, padding: '2px 8px', fontSize: 11 }}>{messages.length}</span>}
                   </button>
                   {phase === 'walking' && (
                     <div style={{ display: 'flex', gap: 8 }}>
                       <button onClick={() => sendPottyEvent('pee')}
                         style={{ flex: 1, padding: 12, background: '#F0F9FF', color: '#0369A1', border: '1.5px solid #BAE6FD', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                         💦 Pipi fait
                       </button>
                       <button onClick={() => sendPottyEvent('poop')}
                         style={{ flex: 1, padding: 12, background: '#FDF6EC', color: '#92600C', border: '1.5px solid #F5DEB3', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                         💩 Caca fait
                       </button>
                       <button onClick={() => document.getElementById('walkerPhoto').click()} disabled={sendingPhoto}
                         style={{ flex: 1, padding: 12, background: '#F0F9F5', color: '#1D9E75', border: '1.5px solid #1D9E75', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: sendingPhoto ? 'default' : 'pointer', fontFamily: 'inherit', opacity: sendingPhoto ? 0.6 : 1 }}>
                         {sendingPhoto ? '⏳...' : '📷 Photo'}
                       </button>
                       <input id="walkerPhoto" type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhoto} />
                     </div>
                   )}
                 </div>
               )}

               {phase === 'navigating' && (
                 <button onClick={confirmArrival}
                   style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(29,158,117,0.4)' }}>
                   🐾 Je suis arrivé
                 </button>
               )}
               {phase === 'arrived' && (
                 <div style={{ background: '#FFF8E1', borderRadius: 12, padding: '14px 16px', textAlign: 'center', fontSize: 13, color: '#B8860B', fontWeight: 600, animation: 'pulse 2s infinite' }}>
                   ⏳ En attente que {mission.owner} confirme vous avoir remis {mission.dog}...
                 </div>
               )}
               {phase === 'pickup_photo' && (
                 <div style={{ background: '#F0F9F5', border: '1.5px dashed #1D9E75', borderRadius: 14, padding: '18px 16px', textAlign: 'center' }}>
                   <div style={{ fontSize: 30, marginBottom: 8 }}>📸</div>
                   <div style={{ fontSize: 14, fontWeight: 700, color: '#0F6E56', marginBottom: 4 }}>
                     Photo obligatoire avant de démarrer
                   </div>
                   <div style={{ fontSize: 12.5, color: '#555', marginBottom: 14, lineHeight: 1.4 }}>
                     Prenez {mission.dog} en photo maintenant, au moment où {mission.owner} vous le confie. Ça sert de preuve pour vous deux.
                   </div>
                   <button onClick={() => document.getElementById('walkerPickupPhoto').click()} disabled={sendingPhoto}
                     style={{ width: '100%', padding: 14, background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: sendingPhoto ? 'default' : 'pointer', opacity: sendingPhoto ? 0.6 : 1, fontFamily: 'inherit' }}>
                     {sendingPhoto ? '⏳ Envoi...' : '📷 Prendre la photo'}
                   </button>
                   <input id="walkerPickupPhoto" type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => handlePhoto(e, 'handover_photo')} />
                 </div>
               )}
               {phase === 'walking' && (
                 <button onClick={endWalk}
                   style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(29,158,117,0.4)' }}>
                   ✅ Terminer la balade
                 </button>
               )}
               {phase === 'return_photo' && (
                 <div style={{ background: '#F0F9F5', border: '1.5px dashed #1D9E75', borderRadius: 14, padding: '18px 16px', textAlign: 'center' }}>
                   <div style={{ fontSize: 30, marginBottom: 8 }}>📸</div>
                   <div style={{ fontSize: 14, fontWeight: 700, color: '#0F6E56', marginBottom: 4 }}>
                     Photo obligatoire avant de rendre {mission.dog}
                   </div>
                   <div style={{ fontSize: 12.5, color: '#555', marginBottom: 14, lineHeight: 1.4 }}>
                     Prenez {mission.dog} en photo juste avant de le rendre à {mission.owner}. Ensuite, {mission.owner} devra confirmer qu'il/elle l'a bien récupéré.
                   </div>
                   <button onClick={() => document.getElementById('walkerReturnPhoto').click()} disabled={sendingPhoto}
                     style={{ width: '100%', padding: 14, background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: sendingPhoto ? 'default' : 'pointer', opacity: sendingPhoto ? 0.6 : 1, fontFamily: 'inherit' }}>
                     {sendingPhoto ? '⏳ Envoi...' : '📷 Prendre la photo'}
                   </button>
                   <input id="walkerReturnPhoto" type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={(e) => handlePhoto(e, 'return_photo')} />
                 </div>
               )}
               {phase === 'returning' && (
                 <div style={{ background: '#FFF8E1', borderRadius: 12, padding: '14px 16px', textAlign: 'center', fontSize: 13, color: '#B8860B', fontWeight: 600, animation: 'pulse 2s infinite' }}>
                   ⏳ En attente que {mission.owner} confirme avoir récupéré {mission.dog}...
                 </div>
               )}
               {(phase === 'navigating' || phase === 'arrived') && (
                 <button onClick={cancelActiveMission}
                   style={{ width: '100%', padding: 13, background: 'transparent', color: '#E24B4A', border: '1.5px solid #E24B4A', borderRadius: 14, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 10, fontFamily: 'inherit' }}>
                   ❌ Annuler cette balade
                 </button>
               )}
             </div>
           )}
         </div>
       )}

       {/* GAINS */}
       {tab === 'gains' && (
         <div style={{ animation: 'slidein 0.3s ease' }}>
           <div style={{ background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', borderRadius: 18, padding: '24px', marginBottom: 20, textAlign: 'center' }}>
             <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 4 }}>Gains ce mois</div>
             <div style={{ fontSize: 40, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{monthEarnings}€</div>
             <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>dont {todayEarnings}€ aujourd'hui</div>
           </div>
           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
             {[
               { label: 'Balades', value: String(totalWalks), icon: '🐾' },
               { label: 'Note moy.', value: avgRating ? `${avgRating} ⭐` : 'Nouveau', icon: '⭐' },
               { label: 'Heures', value: hoursLabel, icon: '⏱️' },
               { label: 'Clients', value: String(clientCount), icon: '👥' },
             ].map(s => (
               <div key={s.label} style={{ background: '#fff', borderRadius: 14, padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                 <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
                 <div style={{ fontSize: 18, fontWeight: 700, color: '#1A1A1A' }}>{s.value}</div>
                 <div style={{ fontSize: 12, color: '#888' }}>{s.label}</div>
               </div>
             ))}
           </div>
           <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Historique</h3>
           {history.length === 0 ? (
             <div style={{ textAlign: 'center', padding: '24px', background: '#fff', borderRadius: 16, fontSize: 14, color: '#888' }}>
               Aucune mission terminée pour l'instant
             </div>
           ) : (
             <>
               {/* Calendrier — pour retrouver une mission sans dérouler une liste sans fin */}
               <div style={{ background: '#fff', borderRadius: 16, padding: '16px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                 <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                   <button onClick={() => { setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1)); setCalSelectedDate(null); }}
                     style={{ background: 'none', border: 'none', fontSize: 20, color: '#1D9E75', cursor: 'pointer', padding: '2px 10px', fontFamily: 'inherit' }}>‹</button>
                   <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', textTransform: 'capitalize' }}>
                     {calMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                   </div>
                   <button onClick={() => { setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1)); setCalSelectedDate(null); }}
                     style={{ background: 'none', border: 'none', fontSize: 20, color: '#1D9E75', cursor: 'pointer', padding: '2px 10px', fontFamily: 'inherit' }}>›</button>
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
                   {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                     <div key={i} style={{ textAlign: 'center', fontSize: 11, color: '#AAA', fontWeight: 600 }}>{d}</div>
                   ))}
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                   {calCells.map((day, i) => {
                     if (day == null) return <div key={i} />;
                     const key = dayKey(new Date(calYear, calMonthIndex, day));
                     const dayMissions = missionsByDay[key] || [];
                     const isSelected = calSelectedDate === key;
                     return (
                       <div key={i}
                         onClick={() => dayMissions.length > 0 && setCalSelectedDate(sel => sel === key ? null : key)}
                         style={{ textAlign: 'center', padding: '6px 0', borderRadius: 10, cursor: dayMissions.length > 0 ? 'pointer' : 'default', background: isSelected ? '#1D9E75' : 'transparent' }}>
                         <div style={{ fontSize: 13, fontWeight: dayMissions.length > 0 ? 700 : 400, color: isSelected ? '#fff' : (dayMissions.length > 0 ? '#1A1A1A' : '#CCC') }}>
                           {day}
                         </div>
                         {dayMissions.length > 0 && (
                           <div style={{ width: 5, height: 5, borderRadius: '50%', background: isSelected ? '#fff' : '#1D9E75', margin: '3px auto 0' }} />
                         )}
                       </div>
                     );
                   })}
                 </div>
               </div>

               {calSelectedDate ? (
                 (missionsByDay[calSelectedDate] || []).map(h => (
                   <div key={h.id} onClick={() => h.bookingId && openHistoryChat(h)}
                     style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', marginBottom: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 12, cursor: h.bookingId ? 'pointer' : 'default' }}>
                     <div style={{ flex: 1 }}>
                       <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A' }}>{h.dog} · {h.owner}</div>
                       <div style={{ fontSize: 12, color: '#888' }}>{h.date} · {h.duration} min · {'⭐'.repeat(h.rating)}</div>
                     </div>
                     <div style={{ textAlign: 'right' }}>
                       <div style={{ fontSize: 16, fontWeight: 700, color: '#1D9E75' }}>+{h.price}€</div>
                       {h.bookingId && <div style={{ fontSize: 11, color: '#1D9E75', marginTop: 2 }}>💬 Voir</div>}
                     </div>
                   </div>
                 ))
               ) : (
                 <div style={{ textAlign: 'center', padding: '20px', background: '#fff', borderRadius: 16, fontSize: 13, color: '#888' }}>
                   Touchez un jour marqué d'un point pour voir vos missions de ce jour-là.
                 </div>
               )}
             </>
           )}
         </div>
       )}

       {/* PROFIL */}
       {tab === 'profile' && (
         <div style={{ animation: 'slidein 0.3s ease' }}>

           {editSuccess && (
             <div style={{ background: '#E1F5EE', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#0F6E56', fontWeight: 600, textAlign: 'center' }}>
               ✅ Profil mis à jour avec succès !
             </div>
           )}

           {/* Photo profil */}
           <div style={{ background: '#fff', borderRadius: 18, padding: '24px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', textAlign: 'center' }}>
             <div style={{ position: 'relative', display: 'inline-block', marginBottom: 12 }}>
               <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#E1F5EE', overflow: 'hidden', border: '3px solid #1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
                 {(newWalkerPhoto || profile?.photo_url)
                   ? <img src={newWalkerPhoto || profile.photo_url} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                   : '🧑'
                 }
               </div>
               <div onClick={() => document.getElementById('walkerPhotoInput').click()}
                 style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: '50%', background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14 }}>
                 ✏
               </div>
               <input id="walkerPhotoInput" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleWalkerPhotoChange} />
             </div>
             <div style={{ fontSize: 20, fontWeight: 700, color: '#1A1A1A', marginBottom: 4 }}>{displayName}</div>
             <div style={{ fontSize: 14, color: '#1D9E75', marginBottom: 4 }}>{ratingLabel} · {totalWalks} balade{totalWalks > 1 ? 's' : ''}</div>
             <div style={{ fontSize: 13, color: '#888' }}>Promeneur Dogger 🐾</div>
           </div>

           {/* Infos modifiables */}
           <div style={{ background: '#fff', borderRadius: 16, padding: '20px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
               <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>Mes informations</div>
               <button onClick={() => setEditMode(e => !e)}
                 style={{ background: editMode ? '#FFF0F0' : '#E1F5EE', border: 'none', color: editMode ? '#E24B4A' : '#1D9E75', fontSize: 12, fontWeight: 700, borderRadius: 20, padding: '4px 14px', cursor: 'pointer', fontFamily: 'inherit' }}>
                 {editMode ? 'Annuler' : '✏️ Modifier'}
               </button>
             </div>

             {editMode ? (
               <div>
                 {/* Prénom et nom : fixés à la création du compte, non modifiables */}
                 <div style={{ background: '#F8FAF9', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                   <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 4 }}>Prénom et nom</div>
                   <div style={{ fontSize: 14, color: '#1A1A1A', fontWeight: 600, marginBottom: 4 }}>
                     {`${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || '—'}
                   </div>
                   <div style={{ fontSize: 12, color: '#AAA', lineHeight: 1.4 }}>🔒 Non modifiables une fois le compte créé.</div>
                 </div>
                 <div style={{ marginBottom: 14 }}>
                   <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 6 }}>Téléphone</div>
                   <input
                     style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #E8E8E8', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#FAFAFA', boxSizing: 'border-box' }}
                     value={editForm.phone}
                     placeholder="6 12 34 56 78"
                     onChange={e => setEditForm(ef => ({ ...ef, phone: e.target.value }))}
                   />
                 </div>
                 <div style={{ marginBottom: 18 }}>
                   <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 6 }}>Présentation (visible par les propriétaires)</div>
                   <textarea
                     style={{ width: '100%', minHeight: 80, padding: '12px 14px', borderRadius: 10, border: '1.5px solid #E8E8E8', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#FAFAFA', boxSizing: 'border-box', resize: 'vertical' }}
                     value={editForm.bio}
                     placeholder="Présentez-vous en quelques mots..."
                     onChange={e => setEditForm(ef => ({ ...ef, bio: e.target.value }))}
                   />
                 </div>
                 <button onClick={handleSaveProfile} disabled={editLoading}
                   style={{ width: '100%', padding: 14, background: editLoading ? '#A8D5C4' : 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: editLoading ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                   {editLoading ? 'Sauvegarde...' : '✅ Sauvegarder'}
                 </button>
               </div>
             ) : (
               <div>
                 {[
                   { icon: '👤', label: 'Prénom', value: profile?.first_name },
                   { icon: '👤', label: 'Nom', value: profile?.last_name },
                   { icon: '📧', label: 'Email', value: profile?.email || '—' },
                   { icon: '📱', label: 'Téléphone', value: profile?.phone ? `+33 ${profile.phone}` : '—' },
                 ].map((item, idx, arr) => (
                   <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #F8F8F8' }}>
                     <span style={{ fontSize: 18 }}>{item.icon}</span>
                     <div style={{ flex: 1 }}>
                       <div style={{ fontSize: 11, color: '#AAA', marginBottom: 1 }}>{item.label}</div>
                       <div style={{ fontSize: 14, color: '#1A1A1A', fontWeight: 500 }}>{item.value || '—'}</div>
                     </div>
                   </div>
                 ))}
                 {walkerProfile?.bio && (
                   <div style={{ marginTop: 12, textAlign: 'left', background: '#F8FAF9', borderRadius: 12, padding: '14px 16px', fontSize: 13, color: '#555', lineHeight: 1.5 }}>
                     {walkerProfile.bio}
                   </div>
                 )}
               </div>
             )}
           </div>

           <div style={{ background: '#fff', borderRadius: 16, padding: '4px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
             {[
               { icon: '📋', label: 'Mes disponibilités', onClick: () => setTab('availability') },
               { icon: '🏦', label: 'Informations bancaires' },
               { icon: '📱', label: 'Notifications' },
               { icon: '🔒', label: 'Sécurité & mot de passe', onClick: () => setTab('security') },
               { icon: '❓', label: 'Aide & Support', onClick: () => openSupportTab() },
               { icon: '🚪', label: 'Se déconnecter', color: '#E24B4A', onClick: handleLogout },
             ].map((item, idx, arr) => (
               <div key={item.label} onClick={item.onClick}
                 style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 0', borderBottom: idx < arr.length - 1 ? '1px solid #F0F0F0' : 'none', cursor: 'pointer' }}>
                 <span style={{ fontSize: 20 }}>{item.icon}</span>
                 <span style={{ fontSize: 15, color: item.color || '#1A1A1A', fontWeight: 500 }}>{item.label}</span>
                 <span style={{ marginLeft: 'auto', color: '#CCC', fontSize: 18 }}>›</span>
               </div>
             ))}
           </div>
         </div>
       )}

       {/* AIDE & SUPPORT */}
       {tab === 'support' && (
         <div style={{ animation: 'slidein 0.3s ease' }}>
           <div onClick={() => setTab('profile')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#1D9E75', fontWeight: 600, fontSize: 14, marginBottom: 14, cursor: 'pointer' }}>
             ← Retour au profil
           </div>

           {/* Urgences — ce que l'app ne peut PAS faire à votre place */}
           <div style={{ background: '#FFF0F0', border: '1.5px solid #FFD0D0', borderRadius: 16, padding: '16px 18px', marginBottom: 16 }}>
             <div style={{ fontSize: 15, fontWeight: 700, color: '#E24B4A', marginBottom: 8 }}>🚨 Urgence</div>
             <div style={{ fontSize: 13, color: '#8A3B3A', lineHeight: 1.6 }}>
               Chien non rendu, danger immédiat : appelez la <strong>police (17)</strong> sans attendre. Dogger ne peut pas intervenir sur place.<br />
               Chien blessé ou malade : contactez un vétérinaire, puis prévenez-nous ci-dessous.<br />
               La conversation et les photos de chaque mission restent consultables dans votre historique : ce sont vos preuves.
             </div>
           </div>

           {/* FAQ */}
           <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>❓ Questions fréquentes</div>
           <div style={{ background: '#fff', borderRadius: 16, padding: '4px 16px', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
             {SUPPORT_FAQ.map((f, idx) => (
               <div key={f.q} style={{ borderBottom: idx < SUPPORT_FAQ.length - 1 ? '1px solid #F0F0F0' : 'none' }}>
                 <div onClick={() => setOpenFaq(o => (o === idx ? null : idx))}
                   style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0', cursor: 'pointer' }}>
                   <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#1A1A1A' }}>{f.q}</span>
                   <span style={{ color: '#CCC', fontSize: 18 }}>{openFaq === idx ? '−' : '+'}</span>
                 </div>
                 {openFaq === idx && (
                   <div style={{ fontSize: 13, color: '#666', lineHeight: 1.6, padding: '0 0 14px' }}>{f.a}</div>
                 )}
               </div>
             ))}
           </div>

           {/* Formulaire de contact */}
           <div style={{ background: '#fff', borderRadius: 16, padding: '20px', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
             <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', marginBottom: 4 }}>✉️ Nous contacter</div>
             <div style={{ fontSize: 12, color: '#888', marginBottom: 14, lineHeight: 1.5 }}>
               Votre message et notre réponse restent dans « Mes demandes », juste en dessous.
             </div>

             <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 6 }}>Sujet</div>
             <select value={supportForm.subject}
               onChange={e => setSupportForm(f => ({ ...f, subject: e.target.value }))}
               style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #E8E8E8', fontSize: 14, fontFamily: 'inherit', background: '#FAFAFA', color: '#1A1A1A', marginBottom: 14, boxSizing: 'border-box' }}>
               <option value="">Choisissez un sujet</option>
               {SUPPORT_SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
             </select>

             <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 6 }}>Balade concernée (facultatif)</div>
             <select value={supportForm.bookingId}
               onChange={e => setSupportForm(f => ({ ...f, bookingId: e.target.value }))}
               style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #E8E8E8', fontSize: 14, fontFamily: 'inherit', background: '#FAFAFA', color: '#1A1A1A', marginBottom: 14, boxSizing: 'border-box' }}>
               <option value="">Aucune balade en particulier</option>
               {history.filter(h => h.bookingId).map(h => (
                 <option key={h.id} value={h.bookingId}>{h.date} · {h.dog} · {h.owner}</option>
               ))}
             </select>

             <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 6 }}>Votre message</div>
             <textarea value={supportForm.message}
               onChange={e => setSupportForm(f => ({ ...f, message: e.target.value }))}
               placeholder="Décrivez ce qui s'est passé, avec la date si vous l'avez."
               style={{ width: '100%', minHeight: 110, padding: '12px 14px', borderRadius: 10, border: '1.5px solid #E8E8E8', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#FAFAFA', boxSizing: 'border-box', resize: 'vertical', marginBottom: 14 }} />

             {supportError && (
               <div style={{ background: '#FFF0F0', border: '1px solid #FFD0D0', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#E24B4A', marginBottom: 12 }}>
                 ⚠️ {supportError}
               </div>
             )}
             {supportSent && (
               <div style={{ background: '#E1F5EE', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#0F6E56', fontWeight: 600, marginBottom: 12 }}>
                 ✅ Message envoyé — la réponse apparaîtra dans « Mes demandes ».
               </div>
             )}

             <button onClick={sendSupportTicket} disabled={supportSending}
               style={{ width: '100%', padding: 14, background: supportSending ? '#A8D5C4' : 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: supportSending ? 'default' : 'pointer', fontFamily: 'inherit' }}>
               {supportSending ? 'Envoi...' : 'Envoyer ma demande'}
             </button>
           </div>

           {/* Mes demandes */}
           <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', marginBottom: 8 }}>📮 Mes demandes</div>
           <div style={{ background: '#fff', borderRadius: 16, padding: '16px 18px', marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
             {supportLoading ? (
               <div style={{ fontSize: 13, color: '#AAA', textAlign: 'center', padding: '12px 0' }}>Chargement...</div>
             ) : supportTickets.length === 0 ? (
               <div style={{ fontSize: 13, color: '#AAA', textAlign: 'center', padding: '12px 0' }}>Aucune demande envoyée pour l'instant.</div>
             ) : supportTickets.map((t, idx) => (
               <div key={t.id} style={{ paddingTop: idx === 0 ? 0 : 14, marginTop: idx === 0 ? 0 : 14, borderTop: idx === 0 ? 'none' : '1px solid #F0F0F0' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                   <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A' }}>{t.subject}</span>
                   <span style={{ fontSize: 11, fontWeight: 700, color: t.admin_reply ? '#1D9E75' : '#B8860B', background: t.admin_reply ? '#E1F5EE' : '#FFF8E1', borderRadius: 10, padding: '3px 9px', whiteSpace: 'nowrap' }}>
                     {t.admin_reply ? '✅ Répondu' : '⏳ En attente'}
                   </span>
                 </div>
                 <div style={{ fontSize: 11, color: '#AAA', marginBottom: 6 }}>{new Date(t.created_at).toLocaleDateString('fr-FR')}</div>
                 <div style={{ fontSize: 13, color: '#666', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{t.message}</div>
                 {t.admin_reply && (
                   <div style={{ background: '#F8FAF9', borderLeft: '3px solid #1D9E75', borderRadius: 8, padding: '10px 12px', marginTop: 10 }}>
                     <div style={{ fontSize: 11, fontWeight: 700, color: '#1D9E75', marginBottom: 3 }}>💬 Réponse de Dogger</div>
                     <div style={{ fontSize: 13, color: '#1A1A1A', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{t.admin_reply}</div>
                   </div>
                 )}
               </div>
             ))}
           </div>
         </div>
       )}

       {/* SÉCURITÉ & MOT DE PASSE */}
       {tab === 'security' && (
         <div style={{ animation: 'slidein 0.3s ease' }}>
           <div onClick={() => setTab('profile')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#1D9E75', fontWeight: 600, fontSize: 14, marginBottom: 14, cursor: 'pointer' }}>
             ← Retour au profil
           </div>

           <div style={{ background: '#fff', borderRadius: 16, padding: '20px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
             <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 6 }}>Adresse e-mail</div>
             <div style={{ fontSize: 14, color: '#1A1A1A', fontWeight: 500 }}>{profile?.email || '—'}</div>
           </div>

           <div style={{ background: '#fff', borderRadius: 16, padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
             <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', marginBottom: 14 }}>Changer de mot de passe</div>

             {passwordSuccess && (
               <div style={{ background: '#E1F5EE', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#0F6E56', fontWeight: 600, textAlign: 'center' }}>
                 ✅ Mot de passe mis à jour !
               </div>
             )}
             {passwordError && (
               <div style={{ background: '#FFF0F0', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#E24B4A', fontWeight: 600, textAlign: 'center' }}>
                 {passwordError}
               </div>
             )}

             <div style={{ marginBottom: 14 }}>
               <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 6 }}>Mot de passe actuel</div>
               <input
                 type="password"
                 style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #E8E8E8', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#FAFAFA', boxSizing: 'border-box' }}
                 value={currentPassword}
                 placeholder="Votre mot de passe actuel"
                 onChange={e => setCurrentPassword(e.target.value)}
               />
             </div>
             <div style={{ marginBottom: 14 }}>
               <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 6 }}>Nouveau mot de passe</div>
               <input
                 type="password"
                 style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #E8E8E8', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#FAFAFA', boxSizing: 'border-box' }}
                 value={newPassword}
                 placeholder="Au moins 6 caractères"
                 onChange={e => setNewPassword(e.target.value)}
               />
             </div>
             <div style={{ marginBottom: 18 }}>
               <div style={{ fontSize: 12, fontWeight: 600, color: '#888', marginBottom: 6 }}>Confirmer le nouveau mot de passe</div>
               <input
                 type="password"
                 style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #E8E8E8', fontSize: 14, fontFamily: 'inherit', outline: 'none', background: '#FAFAFA', boxSizing: 'border-box' }}
                 value={confirmPassword}
                 placeholder="Retapez le mot de passe"
                 onChange={e => setConfirmPassword(e.target.value)}
                 onKeyPress={e => e.key === 'Enter' && handleChangePassword()}
               />
             </div>
             <button onClick={handleChangePassword} disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
               style={{ width: '100%', padding: 14, background: (passwordSaving || !currentPassword || !newPassword || !confirmPassword) ? '#F0F0F0' : 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: (passwordSaving || !currentPassword || !newPassword || !confirmPassword) ? '#AAA' : '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: (passwordSaving || !currentPassword || !newPassword || !confirmPassword) ? 'default' : 'pointer', fontFamily: 'inherit' }}>
               {passwordSaving ? 'Vérification...' : '🔒 Mettre à jour le mot de passe'}
             </button>
           </div>
         </div>
       )}

       {/* MES DISPONIBILITÉS */}
       {tab === 'availability' && (
         <div style={{ animation: 'slidein 0.3s ease' }}>
           <div onClick={() => setTab('profile')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#1D9E75', fontWeight: 600, fontSize: 14, marginBottom: 14, cursor: 'pointer' }}>
             ← Retour au profil
           </div>

           <p style={{ fontSize: 13, color: '#888', marginBottom: 14 }}>Déclarez vos disponibilités sur le calendrier — séparément pour la Balade et la Garde à domicile. Touchez un jour pour le déclarer seul, ou utilisez les boutons ci-dessous pour cocher plusieurs jours d'un coup (une période, ou tout le mois).</p>

           <div style={{ display: 'flex', background: '#F0F0F0', borderRadius: 14, padding: 4, marginBottom: 16 }}>
             {[{ id: 'walk', label: '🐕 Balade' }, { id: 'home', label: '🏠 Garde à domicile' }].map(s => (
               <button key={s.id} onClick={() => setAvailService(s.id)} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 11, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: availService === s.id ? '#fff' : 'transparent', color: availService === s.id ? '#1D9E75' : '#888', boxShadow: availService === s.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none', fontFamily: 'inherit' }}>{s.label}</button>
             ))}
           </div>

           {availLoading ? (
             <div style={{ textAlign: 'center', padding: 30, color: '#888', fontSize: 14 }}>Chargement...</div>
           ) : (
             <>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                 <button onClick={() => setAvailCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))} style={{ background: 'none', border: 'none', fontSize: 18, color: '#1D9E75', cursor: 'pointer', padding: 4 }}>‹</button>
                 <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', textTransform: 'capitalize' }}>{availCalMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>
                 <button onClick={() => setAvailCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))} style={{ background: 'none', border: 'none', fontSize: 18, color: '#1D9E75', cursor: 'pointer', padding: 4 }}>›</button>
               </div>

               {/* Raccourcis pour sélectionner plusieurs jours d'un coup, plutôt
                   que de devoir enregistrer chaque jour un par un. */}
               <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                 {availPickingRange ? (
                   <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFF6E0', border: '1.5px solid #F0B429', borderRadius: 10, padding: '9px 12px' }}>
                     <span style={{ fontSize: 12, color: '#8A6100', fontWeight: 600 }}>Touchez le dernier jour de la période (du {availRangeAnchor ? new Date(`${availRangeAnchor}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''})</span>
                     <span onClick={() => setAvailPickingRange(false)} style={{ fontSize: 12, color: '#8A6100', fontWeight: 700, cursor: 'pointer', marginLeft: 8 }}>✕</span>
                   </div>
                 ) : (
                   <>
                     <button onClick={startRangePicking} disabled={availSelectedDates.length !== 1} style={{ flex: 1, padding: '9px 6px', borderRadius: 10, border: '1.5px solid #E8E8E8', background: '#fff', color: availSelectedDates.length === 1 ? '#1D9E75' : '#CCC', fontSize: 12, fontWeight: 600, cursor: availSelectedDates.length === 1 ? 'pointer' : 'default', fontFamily: 'inherit' }}>
                       🔗 Étendre à une période
                     </button>
                     <button onClick={selectWholeMonth} style={{ flex: 1, padding: '9px 6px', borderRadius: 10, border: '1.5px solid #E8E8E8', background: '#fff', color: '#1D9E75', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                       ✅ Tout le mois
                     </button>
                   </>
                 )}
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
                 {['L','M','M','J','V','S','D'].map((d, i) => (
                   <div key={i} style={{ textAlign: 'center', fontSize: 11, color: '#AAA', fontWeight: 600 }}>{d}</div>
                 ))}
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 16 }}>
                 {availCalCells.map((day, i) => {
                   if (!day) return <div key={i} />;
                   const dateStr = `${availCalYear}-${String(availCalMonthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                   const isPast = dateStr < todayKey;
                   const dayInfo = availability[availService]?.[dateStr];
                   const hasAvail = dayInfo && (dayInfo.fullDay || dayInfo.slots.length > 0);
                   const isSelected = availSelectedDates.includes(dateStr);
                   const isRangeAnchor = availPickingRange && availRangeAnchor === dateStr;
                   const isToday = dateStr === todayKey;
                   return (
                     <div key={i} onClick={() => !isPast && handleCalendarDayClick(dateStr)}
                       style={{ aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 10, cursor: isPast ? 'default' : 'pointer', opacity: isPast ? 0.3 : 1, background: isSelected ? '#1D9E75' : hasAvail ? '#E1F5EE' : 'transparent', border: isRangeAnchor ? '1.5px solid #F0B429' : (isToday && !isSelected ? '1.5px solid #1D9E75' : '1.5px solid transparent') }}>
                       <span style={{ fontSize: 13, fontWeight: isSelected ? 700 : 400, color: isSelected ? '#fff' : '#1A1A1A' }}>{day}</span>
                       {hasAvail && !isSelected && <span style={{ fontSize: 8, color: '#1D9E75' }}>{dayInfo.fullDay ? '🌞' : '●'}</span>}
                     </div>
                   );
                 })}
               </div>

               {availSelectedDates.length > 0 ? (
                 <div style={{ background: '#F8FAF9', borderRadius: 16, padding: '16px', marginBottom: 16 }}>
                   <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                     <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', textTransform: 'capitalize' }}>
                       {availSelectedDates.length === 1
                         ? new Date(`${availSelectedDates[0]}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
                         : `${availSelectedDates.length} jours sélectionnés (du ${new Date(`${availSelectedDates[0]}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au ${new Date(`${availSelectedDates[availSelectedDates.length - 1]}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })})`}
                     </div>
                     {availSelectedDates.length > 1 && (
                       <span onClick={clearAvailSelection} style={{ fontSize: 12, color: '#AAA', fontWeight: 600, cursor: 'pointer' }}>✕ Annuler</span>
                     )}
                   </div>
                   <div onClick={toggleAvailDayFullDay} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, border: availDayFullDay ? '2px solid #1D9E75' : '1.5px solid #E8E8E8', background: availDayFullDay ? '#E1F5EE' : '#fff', cursor: 'pointer', marginBottom: 14 }}>
                     <span style={{ fontSize: 20 }}>🌞</span>
                     <div style={{ flex: 1 }}>
                       <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>Toute la journée</div>
                       <div style={{ fontSize: 11, color: '#888' }}>Disponible de 06:00 à 23:00</div>
                     </div>
                     <div style={{ width: 26, height: 26, borderRadius: '50%', border: `2px solid ${availDayFullDay ? '#1D9E75' : '#CCC'}`, background: availDayFullDay ? '#1D9E75' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff', fontWeight: 700 }}>{availDayFullDay ? '✓' : ''}</div>
                   </div>

                   {!availDayFullDay && (
                     <>
                       <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>Ou seulement certains créneaux :</div>
                       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 4 }}>
                         {AVAIL_SLOTS.map(t => {
                           const active = availDaySlots.includes(t);
                           return (
                             <div key={t} onClick={() => toggleAvailDaySlot(t)} style={{ padding: '10px 4px', textAlign: 'center', borderRadius: 10, border: active ? '2px solid #1D9E75' : '1.5px solid #E8E8E8', background: active ? '#E1F5EE' : '#fff', cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 400, color: active ? '#0F6E56' : '#555' }}>{t}</div>
                           );
                         })}
                       </div>
                     </>
                   )}

                   {availSelectedDates.length > 1 && (
                     <div style={{ background: '#F0F7F4', borderRadius: 10, padding: '8px 12px', marginTop: 12, fontSize: 11, color: '#5A8A78' }}>
                       Ce réglage s'appliquera aux {availSelectedDates.length} jours sélectionnés.
                     </div>
                   )}

                   {availSuccess && (
                     <div style={{ background: '#E1F5EE', borderRadius: 10, padding: '10px 14px', marginTop: 14, marginBottom: 4, fontSize: 13, color: '#0F6E56', fontWeight: 600, textAlign: 'center' }}>
                       ✅ Enregistré !
                     </div>
                   )}
                   <button onClick={saveAvailDays} disabled={availSaving} style={{ width: '100%', padding: 13, marginTop: 14, background: availSaving ? '#F0F0F0' : 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: availSaving ? '#AAA' : '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: availSaving ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                     {availSaving ? 'Enregistrement...' : (availSelectedDates.length > 1 ? `💾 Enregistrer ces ${availSelectedDates.length} jours` : '💾 Enregistrer ce jour')}
                   </button>
                 </div>
               ) : (
                 <div style={{ textAlign: 'center', padding: '20px', color: '#AAA', fontSize: 13 }}>Touchez un jour sur le calendrier pour déclarer votre disponibilité.</div>
               )}
             </>
           )}
         </div>
       )}

       {/* DEMANDES PLANIFIÉES */}
       {tab === 'requests' && (
         <div style={{ animation: 'slidein 0.3s ease' }}>
           <div onClick={() => setTab('home')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#1D9E75', fontWeight: 600, fontSize: 14, marginBottom: 14, cursor: 'pointer' }}>
             ← Retour à l'accueil
           </div>

           {scheduledRequests.length > 0 && (
             <>
               <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', marginBottom: 10 }}>À traiter</h3>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
                 {scheduledRequests.map(b => {
                   const dateLabel = b.scheduled_date ? new Date(`${b.scheduled_date}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
                   return (
                     <div key={b.id} style={{ background: '#fff', borderRadius: 16, padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                       <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', marginBottom: 2 }}>📅 {dateLabel} à {b.scheduled_time}</div>
                       <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>{b.service} · {b.duration} min · {b.dog_name || 'Chien'} · {b.owner_name || 'Propriétaire'}</div>
                       {b.instructions && <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>📝 {b.instructions}</div>}
                       <div style={{ fontSize: 16, fontWeight: 700, color: '#1D9E75', marginBottom: 10 }}>{b.price}€</div>
                       <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                         <button onClick={() => respondScheduledRequest(b, 'accepted')} disabled={scheduledActionLoading === b.id}
                           style={{ flex: 1, padding: '11px', background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>✅ Accepter</button>
                         <button onClick={() => respondScheduledRequest(b, 'refused')} disabled={scheduledActionLoading === b.id}
                           style={{ flex: 1, padding: '11px', background: 'transparent', color: '#E24B4A', border: '1.5px solid #E24B4A', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>❌ Refuser</button>
                       </div>
                       <button onClick={() => setReqChatBooking({ id: b.id, owner: b.owner_name })} style={{ width: '100%', padding: '9px', background: '#F0F9F5', color: '#1D9E75', border: '1.5px solid #1D9E75', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>💬 Discuter avant de répondre</button>
                     </div>
                   );
                 })}
               </div>
             </>
           )}

           {confirmedScheduled.length > 0 && (
             <>
               <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', marginBottom: 10 }}>Confirmées</h3>
               <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                 {confirmedScheduled.map(b => {
                   const dateLabel = b.scheduled_date ? new Date(`${b.scheduled_date}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
                   const todayStr = new Date().toISOString().split('T')[0];
                   const isDue = b.scheduled_date && b.scheduled_date <= todayStr;
                   return (
                     <div key={b.id} style={{ background: '#fff', borderRadius: 16, padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                       <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A', marginBottom: 2 }}>✅ {dateLabel} à {b.scheduled_time}</div>
                       <div style={{ fontSize: 13, color: '#888', marginBottom: 10 }}>{b.service} · {b.duration} min · {b.dog_name || 'Chien'} · {b.owner_name || 'Propriétaire'}</div>
                       <div style={{ display: 'flex', gap: 8 }}>
                         <button onClick={() => setReqChatBooking({ id: b.id, owner: b.owner_name })} style={{ flex: 1, padding: '10px', background: '#F0F9F5', color: '#1D9E75', border: '1.5px solid #1D9E75', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>💬 Discuter</button>
                         <button onClick={() => isDue && startScheduledMission(b)} disabled={!isDue} style={{ flex: 1, padding: '10px', background: isDue ? 'linear-gradient(135deg, #1D9E75, #0F6E56)' : '#F0F0F0', color: isDue ? '#fff' : '#AAA', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: isDue ? 'pointer' : 'default' }}>{isDue ? '▶️ Démarrer' : 'Le jour J'}</button>
                       </div>
                     </div>
                   );
                 })}
               </div>
             </>
           )}

           {scheduledRequests.length === 0 && confirmedScheduled.length === 0 && (
             <div style={{ textAlign: 'center', padding: '40px 20px', background: '#fff', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
               <div style={{ fontSize: 40, marginBottom: 10 }}>📅</div>
               <p style={{ fontSize: 14, color: '#888' }}>Aucune demande planifiée pour le moment.</p>
             </div>
           )}
         </div>
       )}

     </div>

     {/* DISCUSSION SUR UNE DEMANDE PLANIFIÉE (avant ou après décision) */}
     {reqChatBooking && (
       <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }} onClick={() => setReqChatBooking(null)}>
         <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 430, height: '70vh', display: 'flex', flexDirection: 'column' }}>
           <div style={{ padding: '16px', borderBottom: '1px solid #F0F0F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <span style={{ fontSize: 15, fontWeight: 700 }}>💬 {reqChatBooking.owner || 'Propriétaire'}</span>
             <button onClick={() => setReqChatBooking(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>✕</button>
           </div>
           <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
             {reqChatMessages.length === 0 && <div style={{ textAlign: 'center', color: '#AAA', fontSize: 13, marginTop: 20 }}>Posez vos questions avant d'accepter ou de refuser.</div>}
             {reqChatMessages.map(m => (
               <div key={m.id} style={{ alignSelf: m.sender_id === walkerId ? 'flex-end' : 'flex-start', background: m.sender_id === walkerId ? '#1D9E75' : '#F0F0F0', color: m.sender_id === walkerId ? '#fff' : '#1A1A1A', borderRadius: 14, padding: '8px 14px', maxWidth: '75%', fontSize: 14 }}>
                 {m.text}
               </div>
             ))}
           </div>
           <div style={{ padding: '12px 16px', borderTop: '1px solid #F0F0F0', display: 'flex', gap: 8 }}>
             <input value={reqChatInput} onChange={e => setReqChatInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendReqMessage()} placeholder="Votre message..." style={{ flex: 1, padding: '10px 14px', borderRadius: 20, border: '1.5px solid #E8E8E8', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
             <button onClick={sendReqMessage} style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', border: 'none', color: '#fff', fontSize: 16, cursor: 'pointer' }}>➤</button>
           </div>
         </div>
       </div>
     )}

     {/* BOTTOM NAV */}
     <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, background: '#fff', borderTop: '1px solid #F0F0F0', display: 'flex', padding: '8px 0 16px' }}>
       {[
         { id: 'home',    icon: '🏠', label: 'Accueil' },
         { id: 'mission', icon: '🐾', label: 'Mission' },
         { id: 'gains',   icon: '💶', label: 'Gains' },
         { id: 'profile', icon: '👤', label: 'Profil' },
       ].map(t => (
         <button key={t.id} onClick={() => setTab(t.id)}
           style={{ flex: 1, border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px 0', fontFamily: 'inherit', position: 'relative' }}>
           {t.id === 'mission' && (phase === 'navigating' || phase === 'arrived' || phase === 'walking' || phase === 'returning' || phase === 'pickup_photo' || phase === 'return_photo') && (
             <div style={{ position: 'absolute', top: 4, right: '25%', width: 8, height: 8, borderRadius: '50%', background: '#1D9E75', animation: 'pulse 1s infinite' }} />
           )}
           <div style={{ fontSize: 20, marginBottom: 2 }}>{t.icon}</div>
           <div style={{ fontSize: 10, fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? '#1D9E75' : '#AAA' }}>{t.label}</div>
         </button>
       ))}
     </div>

   </div>
 );
}
