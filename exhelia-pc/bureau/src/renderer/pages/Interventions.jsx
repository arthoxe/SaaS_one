import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useWs } from '../contexts/WsContext.jsx'
import api from '../api.js'

const TYPES = ['vmc','pac','solaire','chaudiere','ventilation','climatisation','autre']
const STATUTS = ['planifiee','en_cours','terminee','annulee']

export default function Interventions() {
  const [searchParams] = useSearchParams()
  const { on } = useWs()
  const [interventions, setInterventions] = useState([])
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(searchParams.get('new') === '1')
  const [filters, setFilters]   = useState({ date: '', statut: '', type: '', q: '' })
  const [techniciens, setTechniciens] = useState([])
  const [logements, setLogements]     = useState([])
  const [selected, setSelected]       = useState(null)

  useEffect(() => {
    loadInterventions()
    loadTechniciens()
    const unsub = on('intervention:created', () => loadInterventions())
    const unsub2 = on('rapport:validated', () => loadInterventions())
    return () => { unsub(); unsub2() }
  }, [filters])

  const loadInterventions = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.date)   params.set('date', filters.date)
      if (filters.statut) params.set('statut', filters.statut)
      if (filters.type)   params.set('type', filters.type)
      params.set('limit', '100')
      const { data } = await api.get(`/interventions?${params}`)
      setInterventions(data.data)
    } catch {}
    setLoading(false)
  }

  const loadTechniciens = async () => {
    try {
      const { data } = await api.get('/techniciens')
      setTechniciens(data)
    } catch {}
  }

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Interventions</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Nouvelle intervention
        </button>
      </div>

      {/* Filtres */}
      <div style={styles.filters}>
        <input
          className="input" style={{maxWidth:180}}
          type="date" value={filters.date}
          onChange={e => setFilters(f => ({...f, date: e.target.value}))}
        />
        <select
          className="input" style={{maxWidth:160}}
          value={filters.statut}
          onChange={e => setFilters(f => ({...f, statut: e.target.value}))}
        >
          <option value="">Tous statuts</option>
          {STATUTS.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
        <select
          className="input" style={{maxWidth:160}}
          value={filters.type}
          onChange={e => setFilters(f => ({...f, type: e.target.value}))}
        >
          <option value="">Tous types</option>
          {TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
        </select>
        {(filters.date || filters.statut || filters.type) && (
          <button className="btn btn-secondary btn-sm" onClick={() => setFilters({date:'',statut:'',type:'',q:''})}>
            ✕ Réinitialiser
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div style={styles.center}><span className="loader"/></div>
      ) : interventions.length === 0 ? (
        <div style={styles.empty}>Aucune intervention trouvée</div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                {['Date','Heure','Type','Adresse','Locataire','Technicien','Statut','Actions'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {interventions.map((i, idx) => (
                <tr key={i.id} style={{...styles.tr, animationDelay: `${idx * 0.02}s`}} className="anim-fade-up">
                  <td style={styles.td}>{new Date(i.date_prevue).toLocaleDateString('fr-FR')}</td>
                  <td style={styles.td}>{i.heure_prevue?.slice(0,5) || '—'}</td>
                  <td style={styles.td}>
                    <span style={styles.typeBadge}>{i.type?.toUpperCase()}</span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.adresse}>{i.adresse}</div>
                    <div style={styles.ville}>{i.ville} {i.code_postal}</div>
                    {i.etage && <div style={styles.ville}>Ét. {i.etage} — Porte {i.numero_porte}</div>}
                  </td>
                  <td style={styles.td}>{i.nom_locataire || <span style={styles.na}>—</span>}</td>
                  <td style={styles.td}>
                    {i.tech_nom ? `${i.tech_prenom} ${i.tech_nom}` : <span style={styles.na}>Non assigné</span>}
                  </td>
                  <td style={styles.td}>
                    <span className={`badge badge-${i.statut}`}>{i.statut?.replace('_',' ')}</span>
                  </td>
                  <td style={styles.td}>
                    <div style={{display:'flex',gap:6}}>
                      <button className="btn btn-secondary btn-sm" onClick={() => setSelected(i)}>
                        ✏️ Modifier
                      </button>
                      {i.rapport_id && (
                        <button className="btn btn-secondary btn-sm">📋 Rapport</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal création */}
      {showModal && (
        <CreateModal
          techniciens={techniciens}
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); loadInterventions(); }}
        />
      )}

      {/* Modal modification */}
      {selected && (
        <EditModal
          intervention={selected}
          techniciens={techniciens}
          onClose={() => setSelected(null)}
          onUpdated={() => { setSelected(null); loadInterventions(); }}
        />
      )}
    </div>
  )
}

function CreateModal({ techniciens, onClose, onCreated }) {
  const [form, setForm] = useState({
    type: 'vmc', date_prevue: '', heure_prevue: '',
    technicien_id: '', notes_bureau: '', urgente: false,
    // Logement inline
    adresse: '', ville: '', code_postal: '', etage: '',
    numero_porte: '', digicode: '', nom_locataire: '', telephone_loc: '',
    // Client
    client_nom: '', client_type: 'particulier'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({...f, [k]: v}))

  const handleSubmit = async () => {
    if (!form.adresse || !form.ville || !form.code_postal || !form.date_prevue || !form.client_nom) {
      setError('Remplissez tous les champs obligatoires (*)'); return
    }
    setLoading(true); setError('')
    try {
      // 1. Créer client
      const { data: client } = await api.post('/clients', {
        email: `${form.client_nom.toLowerCase().replace(/\s/g,'')}${Date.now()}@exhelia-client.fr`,
        password: Math.random().toString(36).slice(-10),
        type: form.client_type, nom: form.client_nom
      })
      // 2. Créer logement
      const { data: logement } = await api.post('/logements', {
        client_id: client.id, adresse: form.adresse, ville: form.ville,
        code_postal: form.code_postal, etage: form.etage || null,
        numero_porte: form.numero_porte || null, digicode: form.digicode || null,
        nom_locataire: form.nom_locataire || null, telephone_loc: form.telephone_loc || null
      })
      // 3. Créer intervention
      await api.post('/interventions', {
        logement_id: logement.id, type: form.type,
        date_prevue: form.date_prevue, heure_prevue: form.heure_prevue || null,
        technicien_id: form.technicien_id || null,
        notes_bureau: form.notes_bureau || null,
        urgente: form.urgente
      })
      onCreated()
    } catch(err) {
      setError(err.response?.data?.error || 'Erreur lors de la création')
    }
    setLoading(false)
  }

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={styles.modal} className="anim-fade-up">
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Nouvelle intervention</h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>
        <div style={styles.modalBody}>
          <div style={styles.formGrid}>
            {/* Intervention */}
            <div style={styles.formSection}>
              <h3 style={styles.formSectionTitle}>Intervention</h3>
              <div style={styles.formRow}>
                <div>
                  <label className="input-label">Type *</label>
                  <select className="input" value={form.type} onChange={e => set('type', e.target.value)}>
                    {TYPES.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="input-label">Date *</label>
                  <input className="input" type="date" value={form.date_prevue} onChange={e => set('date_prevue', e.target.value)}/>
                </div>
                <div>
                  <label className="input-label">Heure</label>
                  <input className="input" type="time" value={form.heure_prevue} onChange={e => set('heure_prevue', e.target.value)}/>
                </div>
              </div>
              <div style={styles.formRow}>
                <div>
                  <label className="input-label">Technicien</label>
                  <select className="input" value={form.technicien_id} onChange={e => set('technicien_id', e.target.value)}>
                    <option value="">Non assigné</option>
                    {techniciens.map(t => <option key={t.id} value={t.id}>{t.prenom} {t.nom}</option>)}
                  </select>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:10,paddingTop:24}}>
                  <input type="checkbox" id="urgente" checked={form.urgente} onChange={e => set('urgente', e.target.checked)} style={{accentColor:'var(--danger)'}}/>
                  <label htmlFor="urgente" style={{color:'rgba(255,255,255,0.7)',fontSize:'0.875rem',cursor:'pointer'}}>🚨 Urgente</label>
                </div>
              </div>
              <div>
                <label className="input-label">Notes bureau</label>
                <textarea className="input" rows={2} value={form.notes_bureau} onChange={e => set('notes_bureau', e.target.value)} style={{resize:'vertical'}}/>
              </div>
            </div>

            {/* Client */}
            <div style={styles.formSection}>
              <h3 style={styles.formSectionTitle}>Client</h3>
              <div style={styles.formRow}>
                <div>
                  <label className="input-label">Nom client *</label>
                  <input className="input" placeholder="Dupont" value={form.client_nom} onChange={e => set('client_nom', e.target.value)}/>
                </div>
                <div>
                  <label className="input-label">Type</label>
                  <select className="input" value={form.client_type} onChange={e => set('client_type', e.target.value)}>
                    <option value="particulier">Particulier</option>
                    <option value="bailleur">Bailleur</option>
                    <option value="pro">Professionnel</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Logement */}
            <div style={styles.formSection}>
              <h3 style={styles.formSectionTitle}>Logement</h3>
              <div>
                <label className="input-label">Adresse *</label>
                <input className="input" placeholder="12 rue de la Paix" value={form.adresse} onChange={e => set('adresse', e.target.value)}/>
              </div>
              <div style={styles.formRow}>
                <div>
                  <label className="input-label">Ville *</label>
                  <input className="input" placeholder="Colmar" value={form.ville} onChange={e => set('ville', e.target.value)}/>
                </div>
                <div>
                  <label className="input-label">Code postal *</label>
                  <input className="input" placeholder="68000" value={form.code_postal} onChange={e => set('code_postal', e.target.value)}/>
                </div>
              </div>
              <div style={styles.formRow}>
                <div>
                  <label className="input-label">Étage</label>
                  <input className="input" placeholder="2" value={form.etage} onChange={e => set('etage', e.target.value)}/>
                </div>
                <div>
                  <label className="input-label">N° porte</label>
                  <input className="input" placeholder="24" value={form.numero_porte} onChange={e => set('numero_porte', e.target.value)}/>
                </div>
                <div>
                  <label className="input-label">Digicode</label>
                  <input className="input" placeholder="1234A" value={form.digicode} onChange={e => set('digicode', e.target.value)}/>
                </div>
              </div>
              <div style={styles.formRow}>
                <div>
                  <label className="input-label">Nom locataire</label>
                  <input className="input" placeholder="Martin" value={form.nom_locataire} onChange={e => set('nom_locataire', e.target.value)}/>
                </div>
                <div>
                  <label className="input-label">Tél. locataire</label>
                  <input className="input" placeholder="06 12 34 56 78" value={form.telephone_loc} onChange={e => set('telephone_loc', e.target.value)}/>
                </div>
              </div>
            </div>
          </div>

          {error && <div style={styles.modalError}>⚠ {error}</div>}
        </div>
        <div style={styles.modalFooter}>
          <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? <><span className="loader" style={{width:14,height:14}}/> Création...</> : '✓ Créer l\'intervention'}
          </button>
        </div>
      </div>
    </div>
  )
}

function EditModal({ intervention: inter, techniciens, onClose, onUpdated }) {
  const [form, setForm] = useState({
    statut: inter.statut, technicien_id: inter.technicien_id || '',
    date_prevue: inter.date_prevue?.split('T')[0] || '',
    heure_prevue: inter.heure_prevue || '', notes_bureau: inter.notes_bureau || '',
    urgente: inter.urgente || false
  })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm(f => ({...f, [k]: v}))

  const handleSave = async () => {
    setLoading(true)
    try {
      await api.patch(`/interventions/${inter.id}`, form)
      onUpdated()
    } catch {}
    setLoading(false)
  }

  return (
    <div style={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{...styles.modal, maxWidth: 520}} className="anim-fade-up">
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Modifier l'intervention</h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>
        <div style={styles.modalBody}>
          <div style={styles.infoBlock}>
            <span style={styles.infoBadge}>{inter.type?.toUpperCase()}</span>
            <strong style={{color:'#fff'}}>{inter.adresse}</strong>
            <span style={{color:'rgba(255,255,255,0.4)'}}>{inter.ville}</span>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            <div style={styles.formRow}>
              <div>
                <label className="input-label">Date</label>
                <input className="input" type="date" value={form.date_prevue} onChange={e => set('date_prevue', e.target.value)}/>
              </div>
              <div>
                <label className="input-label">Heure</label>
                <input className="input" type="time" value={form.heure_prevue} onChange={e => set('heure_prevue', e.target.value)}/>
              </div>
            </div>
            <div style={styles.formRow}>
              <div>
                <label className="input-label">Statut</label>
                <select className="input" value={form.statut} onChange={e => set('statut', e.target.value)}>
                  {STATUTS.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="input-label">Technicien</label>
                <select className="input" value={form.technicien_id} onChange={e => set('technicien_id', e.target.value)}>
                  <option value="">Non assigné</option>
                  {techniciens.map(t => <option key={t.id} value={t.id}>{t.prenom} {t.nom}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="input-label">Notes bureau</label>
              <textarea className="input" rows={3} value={form.notes_bureau} onChange={e => set('notes_bureau', e.target.value)} style={{resize:'vertical'}}/>
            </div>
          </div>
        </div>
        <div style={styles.modalFooter}>
          <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Sauvegarde...' : '✓ Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  root: { padding: '32px 36px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: '1.5rem', fontWeight: 600, color: '#fff' },
  filters: { display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' },
  center: { display: 'flex', justifyContent: 'center', padding: 60 },
  empty: { textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: '60px 0' },
  tableWrap: { overflowX: 'auto', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '12px 16px', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.07)' },
  tr: { borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.12s', cursor: 'pointer' },
  td: { padding: '13px 16px', fontSize: '0.875rem', color: 'rgba(255,255,255,0.75)', verticalAlign: 'middle' },
  adresse: { color: '#fff', fontWeight: 500 },
  ville: { fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 },
  typeBadge: { fontSize: '0.72rem', fontWeight: 700, color: 'var(--green)', letterSpacing: '0.05em' },
  na: { color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' },
  // Modal
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' },
  modal: { background: '#1e2d42', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '90%', maxWidth: 780, maxHeight: '90vh', display: 'flex', flexDirection: 'column' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' },
  modalTitle: { fontSize: '1.1rem', fontWeight: 600, color: '#fff' },
  closeBtn: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '1.1rem', padding: 4 },
  modalBody: { padding: '24px', overflowY: 'auto', flex: 1 },
  modalFooter: { padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end', gap: 12 },
  modalError: { background: 'rgba(231,76,60,0.12)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: 8, padding: '10px 14px', color: '#e74c3c', fontSize: '0.875rem', marginTop: 16 },
  formGrid: { display: 'flex', flexDirection: 'column', gap: 24 },
  formSection: { display: 'flex', flexDirection: 'column', gap: 14 },
  formSectionTitle: { fontSize: '0.75rem', fontWeight: 600, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.1em', paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.06)' },
  formRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 },
  infoBlock: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 },
  infoBadge: { fontSize: '0.72rem', fontWeight: 700, color: 'var(--green)', background: 'rgba(74,184,64,0.12)', padding: '3px 8px', borderRadius: 4 },
}
