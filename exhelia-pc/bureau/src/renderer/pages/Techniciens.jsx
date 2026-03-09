import { useState, useEffect } from 'react'
import api from '../api.js'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function Techniciens() {
  const { user } = useAuth()
  const isAdmin  = user?.role === 'admin'
  const isChef   = user?.role === 'bureau'
  const canManage = isAdmin || isChef

  const [chefs, setChefs]           = useState([])
  const [sansequipe, setSansequipe] = useState([])
  const [loading, setLoading]       = useState(true)
  const [expandedChef, setExpandedChef] = useState(null)
  const [showModal, setShowModal]   = useState(false)
  const [form, setForm] = useState({ email:'', password:'', nom:'', prenom:'', telephone:'', chef_id:'' })
  const [error, setError] = useState('')
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const { data: chefsData } = await api.get('/chefs')
      setChefs(chefsData)
      // ?tous=true pour récupérer TOUS les techniciens y compris sans équipe
      const { data: allTechs }  = await api.get('/techniciens?tous=true')
      const inTeam = chefsData.flatMap(c => (c.techniciens||[]).map(t => t.id))
      setSansequipe(allTechs.filter(t => !inTeam.includes(t.id)))
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  const createTech = async () => {
    setError('')
    try {
      await api.post('/techniciens', form)
      setShowModal(false)
      setForm({ email:'', password:'', nom:'', prenom:'', telephone:'', chef_id:'' })
      load()
    } catch(e) { setError(e.response?.data?.error || 'Erreur') }
  }

  const deleteTech = async (id) => {
    if (!window.confirm('Supprimer ce technicien ?')) return
    try { await api.delete('/techniciens/' + id); load() } catch {}
  }

  const deleteChef = async (id) => {
    if (!window.confirm('Supprimer ce chef ? Les techniciens de son équipe seront sans équipe.')) return
    try { await api.delete('/chefs/' + id); load() } catch {}
  }

  const assignerChef = async (techId, chefId) => {
    try {
      await api.patch('/techniciens/' + techId, { chef_id: chefId || null })
      load()
    } catch(e) { alert(e.response?.data?.error || 'Erreur assignation') }
  }

  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:60 }}><span className="loader"/></div>

  return (
    <div style={{ padding:'32px 36px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:28 }}>
        <h1 style={{ fontSize:'1.5rem', fontWeight:600, color:'#fff' }}>Equipes</h1>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Ajouter un technicien</button>
        )}
      </div>

      {chefs.map(chef => (
        <div key={chef.id} style={{ marginBottom:16 }}>
          <div style={{
            display:'flex', alignItems:'center', gap:14, padding:'14px 20px',
            background:'rgba(74,184,64,0.06)', border:'1px solid rgba(74,184,64,0.2)',
            borderRadius: expandedChef===chef.id ? '12px 12px 0 0' : 12, cursor:'pointer'
          }} onClick={() => setExpandedChef(expandedChef===chef.id ? null : chef.id)}>
            <div style={{ width:44, height:44, borderRadius:'50%', flexShrink:0,
              background:'linear-gradient(135deg,var(--green),#2d8a25)',
              display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:'1rem' }}>
              {chef.prenom?.[0]}{chef.nom?.[0]}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ color:'#fff', fontWeight:600, fontSize:'0.95rem' }}>
                {chef.prenom} {chef.nom}
                <span style={{ fontSize:'0.7rem', color:'var(--green)', marginLeft:8, background:'rgba(74,184,64,0.1)', padding:'2px 8px', borderRadius:4 }}>Chef</span>
              </div>
              <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.35)' }}>{chef.email}</div>
            </div>
            <div style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.3)' }}>{(chef.techniciens||[]).length} tech.</div>
            {isAdmin && (
              <button className="btn btn-danger btn-sm"
                onClick={e => { e.stopPropagation(); deleteChef(chef.id) }}>Supprimer</button>
            )}
            <span style={{ color:'rgba(255,255,255,0.3)', marginLeft:4 }}>{expandedChef===chef.id ? '▲' : '▼'}</span>
          </div>

          {expandedChef===chef.id && (
            <div style={{ border:'1px solid rgba(74,184,64,0.15)', borderTop:'none', borderRadius:'0 0 12px 12px', padding:'10px 12px', background:'rgba(255,255,255,0.01)' }}>
              {(chef.techniciens||[]).length === 0
                ? <div style={{ textAlign:'center', color:'rgba(255,255,255,0.2)', padding:'16px 0', fontSize:'0.85rem' }}>Aucun technicien</div>
                : <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:10, padding:'6px 4px' }}>
                    {(chef.techniciens||[]).map(t => (
                      <TechCard key={t.id} tech={t} canManage={canManage} isAdmin={isAdmin}
                        chefs={chefs} currentChefId={chef.id}
                        onDelete={() => deleteTech(t.id)}
                        onAssign={newChefId => assignerChef(t.id, newChefId)}/>
                    ))}
                  </div>
              }
            </div>
          )}
        </div>
      ))}

      {/* Sans équipe */}
      {sansequipe.length > 0 && (
        <div style={{ marginTop:16 }}>
          <div style={{ fontSize:'0.78rem', fontWeight:700, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12 }}>
            Sans equipe ({sansequipe.length})
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12 }}>
            {sansequipe.map(t => (
              <TechCard key={t.id} tech={t} canManage={canManage} isAdmin={isAdmin}
                chefs={chefs} currentChefId={null}
                onDelete={() => deleteTech(t.id)}
                onAssign={newChefId => assignerChef(t.id, newChefId)}/>
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, backdropFilter:'blur(4px)' }}
          onClick={e => e.target===e.currentTarget && setShowModal(false)}>
          <div style={{ background:'#1e2d42', border:'1px solid rgba(255,255,255,0.1)', borderRadius:16, width:460, padding:32 }} className="anim-fade-up">
            <h2 style={{ color:'#fff', marginBottom:24, fontSize:'1.1rem' }}>Nouveau technicien</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div><label className="input-label">Prenom</label><input className="input" value={form.prenom} onChange={e=>set('prenom',e.target.value)}/></div>
              <div><label className="input-label">Nom</label><input className="input" value={form.nom} onChange={e=>set('nom',e.target.value)}/></div>
              <div><label className="input-label">Email</label><input className="input" type="email" value={form.email} onChange={e=>set('email',e.target.value)}/></div>
              <div><label className="input-label">Mot de passe</label><input className="input" type="password" value={form.password} onChange={e=>set('password',e.target.value)}/></div>
              <div><label className="input-label">Telephone</label><input className="input" type="tel" value={form.telephone} onChange={e=>set('telephone',e.target.value)}/></div>
              <div>
                <label className="input-label">Assigner a un chef (optionnel)</label>
                <select className="input" value={form.chef_id} onChange={e=>set('chef_id',e.target.value)} style={{ colorScheme:'dark', background:'#1e2d42', color:'#fff' }}>
                  <option value="">Sans equipe</option>
                  {chefs.map(c => <option key={c.id} value={c.id} style={{ color:'#fff', background:'#1e2d42' }}>{c.prenom} {c.nom}</option>)}
                </select>
              </div>
              {error && <div style={{ color:'var(--danger)', fontSize:'0.875rem' }}>{error}</div>}
              <div style={{ display:'flex', justifyContent:'flex-end', gap:12, marginTop:8 }}>
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                <button className="btn btn-primary" onClick={createTech}>Creer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TechCard({ tech, canManage, isAdmin, chefs, currentChefId, onDelete, onAssign }) {
  return (
    <div className="card" style={{ padding:'14px 16px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
        <div style={{ width:40, height:40, borderRadius:'50%', flexShrink:0,
          background:'linear-gradient(135deg,#3498db,#2980b9)',
          display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:'0.9rem' }}>
          {tech.prenom?.[0]}{tech.nom?.[0]}
        </div>
        <div style={{ minWidth:0, flex:1 }}>
          <div style={{ color:'#fff', fontWeight:600, fontSize:'0.9rem' }}>{tech.prenom} {tech.nom}</div>
          <div style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.35)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tech.email}</div>
        </div>
      </div>
      {tech.telephone && <div style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.45)', marginBottom:6 }}>{tech.telephone}</div>}
      <div style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.2)', marginBottom: canManage ? 10 : 0 }}>
        {tech.last_login ? 'Co. ' + new Date(tech.last_login).toLocaleDateString('fr-FR') : 'Jamais connecte'}
      </div>
      {canManage && (
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <select
            className="input"
            style={{ flex:1, fontSize:'0.78rem', padding:'5px 8px', colorScheme:'dark', background:'#1e2d42', color:'#fff' }}
            value={currentChefId || ''}
            onChange={e => onAssign(e.target.value)}
          >
            <option value="">Sans equipe</option>
            {chefs.map(c => <option key={c.id} value={c.id} style={{ color:'#fff', background:'#1e2d42' }}>{c.prenom} {c.nom}</option>)}
          </select>
          {isAdmin && (
            <button className="btn btn-danger btn-sm" onClick={onDelete} style={{ padding:'5px 10px', fontSize:'0.75rem', flexShrink:0 }}>X</button>
          )}
        </div>
      )}
    </div>
  )
}
