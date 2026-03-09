import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWs } from '../contexts/WsContext.jsx'
import { useAuth } from '../contexts/AuthContext.jsx'
import api from '../api.js'

const today = new Date().toISOString().split('T')[0]

export default function Dashboard() {
  const { user }   = useAuth()
  const { on }     = useWs()
  const navigate   = useNavigate()
  const [stats, setStats]     = useState({ today: 0, enCours: 0, terminees: 0, total: 0 })
  const [feed, setFeed]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
    const unsubs = [
      on('intervention:created', () => loadData()),
      on('rapport:validated',    () => loadData()),
      on('intervention:updated', () => loadData()),
      on('intervention:deleted', () => loadData()),
    ]
    return () => unsubs.forEach(fn => fn())
  }, [])

  const loadData = async () => {
    try {
      const [todayRes, enCoursRes, termRes, totalRes] = await Promise.all([
        api.get('/interventions?date=' + today + '&limit=100'),
        api.get('/interventions?statut=en_cours&limit=100'),
        api.get('/interventions?statut=terminee&date=' + today + '&limit=100'),
        api.get('/interventions?limit=1'),
      ])
      setStats({
        today:    todayRes.data.total,
        enCours:  enCoursRes.data.total,
        terminees: termRes.data.total,
        total:    totalRes.data.total
      })
      setFeed(todayRes.data.data.slice(0, 15))
    } catch {}
    setLoading(false)
  }

  const dateStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const statItems = [
    { label: "Interventions aujourd'hui", value: stats.today,    color: 'var(--gold)' },
    { label: 'En cours',                  value: stats.enCours,  color: 'var(--green)' },
    { label: "Terminees aujourd'hui",     value: stats.terminees,color: 'rgba(255,255,255,0.5)' },
    { label: 'Total en base',             value: stats.total,    color: 'rgba(255,255,255,0.3)' },
  ]

  return (
    <div style={S.root} className="anim-fade-up">
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Bonjour, {user?.prenom}</h1>
          <p style={S.date}>{dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}</p>
        </div>
      </div>

      <div style={S.statsGrid}>
        {statItems.map((s, i) => (
          <div key={i} className="card anim-fade-up" style={{...S.statCard, animationDelay: i * 0.06 + 's'}}>
            <div style={{...S.statValue, color: s.color}}>
              {loading ? <span className="loader" style={{width:20,height:20}}/> : s.value}
            </div>
            <div style={S.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={S.section}>
        <div style={S.sectionHeader}>
          <h2 style={S.sectionTitle}>Interventions du jour</h2>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/planning')}>
            Voir planning
          </button>
        </div>

        {loading ? (
          <div style={S.center}><span className="loader"/></div>
        ) : feed.length === 0 ? (
          <div style={S.empty}>Aucune intervention planifiee aujourd'hui</div>
        ) : (
          <div style={S.feedList}>
            {feed.map((inter, i) => (
              <div key={inter.id}
                style={{...S.feedItem, animationDelay: i * 0.04 + 's'}}
                className="anim-fade-up"
                onClick={() => navigate('/planning')}
              >
                <div style={S.feedTime}>
                  {inter.heure_prevue ? inter.heure_prevue.slice(0,5) : '--:--'}
                </div>
                <div style={S.feedContent}>
                  <div style={S.feedAdresse}>{inter.adresse}, {inter.ville}</div>
                  <div style={S.feedMeta}>
                    <span style={S.feedType}>{inter.type?.toUpperCase()}</span>
                    {inter.tech_nom && <span style={S.feedTech}>{inter.tech_prenom} {inter.tech_nom}</span>}
                    {inter.nom_locataire && <span style={S.feedLoc}>{inter.nom_locataire}</span>}
                  </div>
                </div>
                <span className={'badge badge-' + inter.statut}>{inter.statut?.replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const S = {
  root: { padding: '32px 36px', maxWidth: 1100, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
  title: { fontSize: '1.6rem', fontWeight: 600, color: '#fff', marginBottom: 4 },
  date:  { fontSize: '0.875rem', color: 'rgba(255,255,255,0.35)' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 },
  statCard: { textAlign: 'center', padding: '24px 16px' },
  statValue: { fontSize: '2.2rem', fontWeight: 700, marginBottom: 6, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.3 },
  section: {},
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: '1rem', fontWeight: 600, color: '#fff' },
  center: { display: 'flex', justifyContent: 'center', padding: 40 },
  empty: { textAlign: 'center', color: 'rgba(255,255,255,0.25)', padding: '40px 0', fontSize: '0.9rem' },
  feedList: { display: 'flex', flexDirection: 'column', gap: 8 },
  feedItem: {
    display: 'flex', alignItems: 'center', gap: 16,
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 10, padding: '14px 18px', cursor: 'pointer',
    transition: 'background 0.15s, border-color 0.15s'
  },
  feedTime: { fontSize: '0.9rem', fontWeight: 600, color: 'var(--gold)', minWidth: 44 },
  feedContent: { flex: 1, minWidth: 0 },
  feedAdresse: { fontSize: '0.9rem', color: '#fff', fontWeight: 500, marginBottom: 4 },
  feedMeta: { display: 'flex', gap: 14, flexWrap: 'wrap' },
  feedType: { fontSize: '0.72rem', color: 'var(--green)', fontWeight: 600, letterSpacing: '0.05em' },
  feedTech: { fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' },
  feedLoc:  { fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' },
}
