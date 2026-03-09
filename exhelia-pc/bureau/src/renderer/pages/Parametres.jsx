import { useState, useEffect } from 'react'
import api from '../api.js'

const INTER_TYPES = ['vmc','pac','solaire','chaudiere','ventilation','climatisation','autre']
const DEFAULT_DURATIONS_INIT = { vmc:60, pac:120, solaire:180, chaudiere:90, ventilation:60, climatisation:120, autre:60 }

export default function Parametres() {
  const [durations, setDurations]   = useState(DEFAULT_DURATIONS_INIT)
  const [chefs, setChefs]           = useState([])
  const [loadingChefs, setLoadingChefs] = useState(true)
  const [savedDur, setSavedDur]     = useState(false)
  const [showCreateChef, setShowCreateChef] = useState(false)
  const [chefForm, setChefForm]     = useState({ email:'', password:'', nom:'', prenom:'', telephone:'' })
  const [chefError, setChefError]   = useState('')
  const [chefLoading, setChefLoading] = useState(false)

  useEffect(() => {
    loadChefs()
    // Charger durées depuis localStorage (en attendant un endpoint dédié)
    const saved = localStorage.getItem('exhelia_durations')
    if (saved) setDurations(JSON.parse(saved))
  }, [])

  const loadChefs = async () => {
    setLoadingChefs(true)
    try {
      const { data } = await api.get('/chefs')
      setChefs(data)
    } catch {}
    setLoadingChefs(false)
  }

  const saveDurations = () => {
    localStorage.setItem('exhelia_durations', JSON.stringify(durations))
    setSavedDur(true)
    setTimeout(() => setSavedDur(false), 2000)
  }

  const createChef = async () => {
    setChefError(''); setChefLoading(true)
    try {
      await api.post('/auth/create-chef', chefForm)
      setShowCreateChef(false)
      setChefForm({ email:'', password:'', nom:'', prenom:'', telephone:'' })
      loadChefs()
    } catch (err) {
      setChefError(err.response?.data?.error || 'Erreur')
    }
    setChefLoading(false)
  }

  const deleteChef = async (id) => {
    if (!confirm('Supprimer ce chef d\'équipe ?')) return
    try { await api.delete(`/chefs/${id}`); loadChefs() } catch {}
  }

  return (
    <div style={{ padding: '32px 36px', maxWidth: 900 }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#fff', marginBottom: 32 }}>Paramètres</h1>

      {/* ── Durées par défaut ── */}
      <div style={S.section}>
        <div style={S.sectionHeader}>
          <div>
            <h2 style={S.sectionTitle}>Durées par défaut</h2>
            <p style={S.sectionDesc}>Durée automatique appliquée lors de la création d'une intervention (en minutes)</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={saveDurations}>
            {savedDur ? 'Sauvegardé' : 'Sauvegarder'}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
          {INTER_TYPES.map(type => (
            <div key={type} style={S.durCard}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{type}</span>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
                  {durations[type] >= 60 ? `${Math.floor(durations[type]/60)}h${durations[type]%60 ? durations[type]%60+'min' : ''}` : `${durations[type]}min`}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  className="input"
                  type="number"
                  min={15} max={480} step={15}
                  value={durations[type]}
                  onChange={e => setDurations(d => ({ ...d, [type]: parseInt(e.target.value) || 60 }))}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>min</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Chefs d'équipe ── */}
      <div style={{ ...S.section, marginTop: 28 }}>
        <div style={S.sectionHeader}>
          <div>
            <h2 style={S.sectionTitle}>Chefs d'équipe</h2>
            <p style={S.sectionDesc}>Gérer les comptes des responsables d'équipe</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreateChef(true)}>
            + Nouveau chef d'équipe
          </button>
        </div>

        {loadingChefs ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 30 }}><span className="loader" /></div>
        ) : chefs.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', padding: '30px 0' }}>
            Aucun chef d'équipe enregistré
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {chefs.map((chef, i) => (
              <div key={chef.id} className="anim-fade-up" style={{ ...S.chefRow, animationDelay: `${i * 0.04}s` }}>
                <div style={S.chefAvatar}>
                  {chef.prenom?.[0]}{chef.nom?.[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>{chef.prenom} {chef.nom}</div>
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)' }}>{chef.email}</div>
                </div>
                {chef.telephone && (
                  <div style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.4)' }}>{chef.telephone}</div>
                )}
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.25)' }}>
                  {chef.last_login ? `Dernière co. ${new Date(chef.last_login).toLocaleDateString('fr-FR')}` : 'Jamais connecté'}
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => deleteChef(chef.id)}>Supprimer</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal créer chef */}
      {showCreateChef && (
        <div style={S.overlay} onClick={e => e.target === e.currentTarget && setShowCreateChef(false)}>
          <div style={S.modal} className="anim-fade-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ color: '#fff', fontSize: '1.05rem' }}>Nouveau chef d'équipe</h2>
              <button onClick={() => setShowCreateChef(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label className="input-label">Prénom *</label><input className="input" value={chefForm.prenom} onChange={e => setChefForm(f => ({ ...f, prenom: e.target.value }))} /></div>
                <div><label className="input-label">Nom *</label><input className="input" value={chefForm.nom} onChange={e => setChefForm(f => ({ ...f, nom: e.target.value }))} /></div>
              </div>
              <div><label className="input-label">Email *</label><input className="input" type="email" value={chefForm.email} onChange={e => setChefForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div><label className="input-label">Mot de passe *</label><input className="input" type="password" value={chefForm.password} onChange={e => setChefForm(f => ({ ...f, password: e.target.value }))} /></div>
              <div><label className="input-label">Téléphone</label><input className="input" value={chefForm.telephone} onChange={e => setChefForm(f => ({ ...f, telephone: e.target.value }))} /></div>
              {chefError && <div style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>⚠ {chefError}</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button className="btn btn-secondary" onClick={() => setShowCreateChef(false)}>Annuler</button>
                <button className="btn btn-primary" onClick={createChef} disabled={chefLoading}>
                  {chefLoading ? 'Création...' : 'Créer le compte'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const S = {
  section: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 24 },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  sectionTitle: { fontSize: '1rem', fontWeight: 600, color: '#fff', marginBottom: 4 },
  sectionDesc: { fontSize: '0.8rem', color: 'rgba(255,255,255,0.35)' },
  durCard: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '14px 16px' },
  chefRow: { display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' },
  chefAvatar: { width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,var(--green),var(--green-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' },
  modal: { background: '#1e2d42', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: 480, padding: 28 },
}
