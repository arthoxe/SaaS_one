import { useState, useEffect } from 'react'
import api from '../api.js'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function Recherche() {
  const { user } = useAuth()
  const isAdmin  = user?.role === 'admin'

  const [q, setQ]             = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [view, setView]       = useState(null)
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [savingEdit, setSavingEdit] = useState(false)
  const [showAddLog, setShowAddLog] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [newLog, setNewLog] = useState({ adresse:'', ville:'', code_postal:'', etage:'', numero_porte:'', digicode:'', nom_locataire:'', telephone_loc:'' })
  const nl = (k,v) => setNewLog(f=>({...f,[k]:v}))
  const ef = (k,v) => setEditForm(f=>({...f,[k]:v}))

  const search = async (e) => {
    e?.preventDefault()
    if (q.length < 2) return
    setLoading(true); setSearched(true); setView(null)
    try { const {data} = await api.get('/recherche?q=' + encodeURIComponent(q)); setResults(data.data||[]) } catch {}
    setLoading(false)
  }

  // Ouvrir un client depuis les résultats de recherche
  // Si matched_logement_id existe ET le nom du client ne matche pas la recherche
  // → aller directement au logement
  const openClientFromSearch = async (r) => {
    const clientNomMatche = r.nom?.toLowerCase().includes(q.toLowerCase()) ||
                            r.prenom?.toLowerCase().includes(q.toLowerCase())
    if (r.matched_logement_id && !clientNomMatche) {
      await openLogementDirect(r.matched_logement_id, null)
    } else {
      await openClient(r.id)
    }
  }

  const openClient = async (id) => {
    setLoading(true)
    try {
      const { data } = await api.get('/recherche/client/' + id)
      setView({ type: 'logements', client: data.client || {}, data: data.logements || [] })
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  const openBatiment = (adresse, logements, client) => {
    setView({ type: 'batiment', adresse, logements, client })
  }

  const openLogement = async (id) => {
    setLoading(true)
    try {
      const { data } = await api.get('/recherche/logement/' + id)
      setView({ type: 'logement', data: data.logement, client: view?.client || { id: data.logement?.client_id, nom: data.logement?.client_nom, prenom: data.logement?.client_prenom, type: data.logement?.client_type }, interventions: data.interventions || [] })
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  // Ouvrir directement un logement sans contexte de vue précédent
  const openLogementDirect = async (id, clientHint) => {
    setLoading(true)
    try {
      const { data } = await api.get('/recherche/logement/' + id)
      setView({
        type: 'logement',
        data: data.logement,
        client: clientHint || { id: data.logement?.client_id, nom: data.logement?.client_nom, prenom: data.logement?.client_prenom, type: data.logement?.client_type },
        interventions: data.interventions || []
      })
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  const deleteClient = (clientId, nom) => setConfirmDelete({ clientId, nom })

  const doDelete = async () => {
    if (!confirmDelete) return
    const { clientId } = confirmDelete
    setConfirmDelete(null)
    try {
      await api.delete('/clients/' + clientId)
      setView(null); setEditing(null)
      setResults(prev => prev.filter(r => r.id !== clientId))
    } catch(e) { console.error(e) }
  }

  const saveEdit = async () => {
    setSavingEdit(true)
    try {
      if (editing.type === 'client') {
        await api.patch('/recherche/client/' + editing.data.id, { nom: editForm.nom, prenom: editForm.prenom, telephone: editForm.telephone })
        setView(v => ({ ...v, client: { ...v.client, ...editForm } }))
      } else if (editing.type === 'logement') {
        const fields = { adresse:1, ville:1, code_postal:1, etage:1, numero_porte:1, digicode:1, nom_locataire:1, telephone_loc:1 }
        const p = {}; Object.keys(fields).forEach(k => { if (editForm[k] !== undefined) p[k] = editForm[k] })
        await api.patch('/recherche/logement/' + editing.data.id, p)
        if (view?.type === 'logement') setView(v => ({ ...v, data: { ...v.data, ...p } }))
        else setView(v => ({ ...v, data: (v.data||[]).map(l => l.id === editing.data.id ? { ...l, ...p } : l) }))
      } else if (editing.type === 'particulier') {
        await api.patch('/recherche/client/' + editing.clientId, { nom: editForm.nom, prenom: editForm.prenom, telephone: editForm.client_tel })
        if (editing.logId) {
          await api.patch('/recherche/logement/' + editing.logId, {
            adresse: editForm.adresse, ville: editForm.ville, code_postal: editForm.code_postal,
            etage: editForm.etage, numero_porte: editForm.numero_porte, digicode: editForm.digicode,
          })
        }
        setView(v => ({
          ...v,
          client: { ...v.client, nom: editForm.nom, prenom: editForm.prenom, telephone: editForm.client_tel },
          data: (v.data||[]).map(l => l.id === editing.logId ? {
            ...l, adresse: editForm.adresse, ville: editForm.ville, code_postal: editForm.code_postal,
            etage: editForm.etage, numero_porte: editForm.numero_porte, digicode: editForm.digicode,
          } : l)
        }))
      }
      setEditing(null)
    } catch(e) { console.error(e) }
    setSavingEdit(false)
  }

  const addLogement = async () => {
    try {
      const { data } = await api.post('/recherche/logement', { client_id: view.client.id, ...newLog })
      setView(v => ({ ...v, data: [...(v.data || []), data] }))
      setNewLog({ adresse:'', ville:'', code_postal:'', etage:'', numero_porte:'', digicode:'', nom_locataire:'', telephone_loc:'' })
      setShowAddLog(false)
    } catch {}
  }

  const S = {
    card: { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'14px 16px', marginBottom:8 },
  }

  const groupByBatiment = (logements) => {
    const map = {}
    ;(logements || []).forEach(l => {
      const key = (l.adresse||'') + '|' + (l.ville||'')
      if (!map[key]) map[key] = { adresse: l.adresse, ville: l.ville, code_postal: l.code_postal, logements: [] }
      map[key].logements.push(l)
    })
    return Object.values(map)
  }

  const isParticulier = view?.client?.type === 'particulier' || view?.client?.type === 'pro'

  const BtnDelete = ({ clientId, nom }) => isAdmin ? (
    <button className="btn btn-danger btn-sm" onClick={() => deleteClient(clientId, nom)}>Supprimer</button>
  ) : null

  // Breadcrumb : reconstruire le chemin vers le client depuis un logement direct
  const breadcrumbClientId = view?.client?.id || view?.data?.client_id

  return (
    <div style={{ padding:'32px 36px', maxWidth:920 }}>
      <h1 style={{ fontSize:'1.5rem', fontWeight:600, color:'#fff', marginBottom:24 }}>Recherche globale</h1>

      <form onSubmit={search} style={{ display:'flex', gap:12, marginBottom:24 }}>
        <input className="input" placeholder="Nom client, adresse, locataire..."
          value={q} onChange={e => setQ(e.target.value)} autoFocus
          style={{ flex:1, fontSize:'1rem', padding:'12px 16px' }}/>
        <button className="btn btn-primary" type="submit" style={{ padding:'12px 24px' }} disabled={q.length < 2 || loading}>
          {loading ? <span className="loader" style={{ width:16, height:16 }}/> : 'Rechercher'}
        </button>
      </form>

      {/* Breadcrumb */}
      {view && (
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16, fontSize:'0.85rem', color:'rgba(255,255,255,0.4)' }}>
          <span style={{ cursor:'pointer', color:'var(--green)' }} onClick={() => setView(null)}>Resultats</span>
          {['logements','batiment','logement'].includes(view.type) && (
            <><span>/</span>
            <span
              style={{ cursor: view.type !== 'logements' ? 'pointer' : 'default', color: view.type !== 'logements' ? 'var(--green)' : '#fff' }}
              onClick={() => view.type !== 'logements' && openClient(breadcrumbClientId)}>
              {view.client?.nom} {view.client?.prenom || ''}
            </span></>
          )}
          {view.type === 'batiment' && <><span>/</span><span style={{ color:'#fff' }}>{view.adresse}</span></>}
          {view.type === 'logement' && <><span>/</span><span style={{ color:'#fff' }}>{view.data?.adresse}</span></>}
        </div>
      )}

      {!view && searched && !loading && results.length === 0 && (
        <div style={{ textAlign:'center', color:'rgba(255,255,255,0.25)', padding:'40px 0' }}>Aucun resultat</div>
      )}

      {!view && results.map((r, i) => (
        <div key={r.id} style={{ ...S.card, animationDelay: i*0.04+'s' }} className="anim-fade-up">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div style={{ cursor:'pointer', flex:1 }} onClick={() => openClientFromSearch(r)}>
              <div style={{ color:'#fff', fontWeight:600, fontSize:'0.95rem', marginBottom:4 }}>{r.nom} {r.prenom || ''}</div>
              <div style={{ display:'flex', gap:10 }}>
                <span style={{ fontSize:'0.72rem', background:'rgba(255,255,255,0.06)', padding:'2px 8px', borderRadius:4, color:'rgba(255,255,255,0.5)' }}>{r.type}</span>
                <span style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.35)' }}>{r.nb_logements} logement(s)</span>
              </div>
            </div>
            {isAdmin && (
              <button className="btn btn-danger btn-sm" style={{ marginLeft:12, flexShrink:0 }}
                onClick={() => deleteClient(r.id, r.nom)}>Supprimer</button>
            )}
          </div>
        </div>
      ))}

      {/* Vue particulier / pro */}
      {view?.type === 'logements' && isParticulier && (() => {
        const log = view.data?.[0]
        return (
          <div>
            <div style={S.card}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
                <div style={{ flex:1 }}>
                  <div style={{ color:'#fff', fontWeight:700, fontSize:'1.05rem' }}>
                    {view.client?.nom} {view.client?.prenom || ''}
                  </div>
                  {view.client?.telephone && <div style={{ fontSize:'0.83rem', color:'rgba(255,255,255,0.45)', marginTop:4 }}>{view.client.telephone}</div>}
                  {log && (
                    <div style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.4)', marginTop:6 }}>
                      {log.adresse}{log.etage ? ' - Et.' + log.etage : ''}{log.numero_porte ? ' P.' + log.numero_porte : ''}<br/>
                      {log.code_postal} {log.ville}{log.digicode ? ' | Code: ' + log.digicode : ''}
                    </div>
                  )}
                </div>
                <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => {
                    setEditing({ type:'particulier', clientId: view.client.id, logId: log?.id })
                    setEditForm({ nom: view.client.nom||'', prenom: view.client.prenom||'', client_tel: view.client.telephone||'', adresse: log?.adresse||'', ville: log?.ville||'', code_postal: log?.code_postal||'', etage: log?.etage||'', numero_porte: log?.numero_porte||'', digicode: log?.digicode||'' })
                  }}>Modifier</button>
                  <BtnDelete clientId={view.client?.id} nom={view.client?.nom}/>
                </div>
              </div>
            </div>
            {log && (
              <div style={{ marginTop:16 }}>
                <div style={{ fontSize:'0.8rem', fontWeight:700, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>Interventions</div>
                <InterventionsLogement logId={log.id} S={S}/>
              </div>
            )}
          </div>
        )
      })()}

      {/* Vue bailleur — maisons + bâtiments */}
      {view?.type === 'logements' && !isParticulier && (() => {
        const maisons   = (view.data||[]).filter(l => l.type_lieu === 'maison')
        const batiments = groupByBatiment((view.data||[]).filter(l => l.type_lieu === 'batiment'))
        return (
          <div>
            {/* Infos client bailleur */}
            <div style={{ ...S.card, marginBottom:16 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ color:'#fff', fontWeight:600, fontSize:'1rem' }}>{view.client?.nom} {view.client?.prenom || ''}</div>
                  {view.client?.telephone && <div style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.4)', marginTop:4 }}>{view.client.telephone}</div>}
                  <span style={{ fontSize:'0.72rem', background:'rgba(255,255,255,0.06)', padding:'2px 8px', borderRadius:4, color:'rgba(255,255,255,0.5)', display:'inline-block', marginTop:6 }}>{view.client?.type}</span>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setEditing({ type:'client', data:view.client }); setEditForm({ ...view.client }) }}>Modifier</button>
                  <BtnDelete clientId={view.client?.id} nom={view.client?.nom}/>
                </div>
              </div>
            </div>

            {/* Section Maisons */}
            {maisons.length > 0 && (
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:'0.75rem', fontWeight:700, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>
                  Maisons ({maisons.length})
                </div>
                {maisons.map(log => (
                  <div key={log.id} style={{ ...S.card, cursor:'pointer' }} onClick={() => openLogement(log.id)}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <div style={{ color:'#fff', fontWeight:600, fontSize:'0.92rem' }}>{log.nom_locataire || 'Sans locataire'}</div>
                        <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.4)', marginTop:3 }}>
                          {log.adresse}, {log.ville} {log.code_postal}
                          {log.digicode ? ' · Code: ' + log.digicode : ''}
                        </div>
                        {log.telephone_loc && <div style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.35)', marginTop:2 }}>{log.telephone_loc}</div>}
                      </div>
                      <span style={{ color:'rgba(255,255,255,0.3)' }}>&#8594;</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Section Bâtiments */}
            {batiments.length > 0 && (
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:'0.75rem', fontWeight:700, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>
                  Batiments ({batiments.length})
                </div>
                {batiments.map((bat, i) => (
                  <div key={i} style={{ ...S.card, cursor:'pointer' }} onClick={() => openBatiment(bat.adresse, bat.logements, view.client)}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <div style={{ color:'#fff', fontWeight:600, fontSize:'0.92rem' }}>{bat.adresse}</div>
                        <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.4)', marginTop:3 }}>
                          {bat.ville} {bat.code_postal} &middot; {bat.logements.length} logement(s)
                        </div>
                      </div>
                      <span style={{ color:'rgba(255,255,255,0.3)' }}>&#8594;</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {maisons.length === 0 && batiments.length === 0 && (
              <div style={{ textAlign:'center', color:'rgba(255,255,255,0.2)', padding:'24px 0' }}>Aucun logement</div>
            )}

            {/* Ajouter logement */}
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:10 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAddLog(v => !v)}>+ Ajouter logement</button>
            </div>
            {showAddLog && (
              <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:14, marginBottom:12 }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:8, marginBottom:8 }}>
                  <div><label className="input-label">Adresse</label><input className="input" value={newLog.adresse} onChange={e=>nl('adresse',e.target.value)}/></div>
                  <div><label className="input-label">CP</label><input className="input" style={{ width:90 }} value={newLog.code_postal} onChange={e=>nl('code_postal',e.target.value)}/></div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8, marginBottom:8 }}>
                  <div><label className="input-label">Ville</label><input className="input" value={newLog.ville} onChange={e=>nl('ville',e.target.value)}/></div>
                  <div><label className="input-label">Etage</label><input className="input" value={newLog.etage} onChange={e=>nl('etage',e.target.value)}/></div>
                  <div><label className="input-label">Porte</label><input className="input" value={newLog.numero_porte} onChange={e=>nl('numero_porte',e.target.value)}/></div>
                  <div><label className="input-label">Digicode</label><input className="input" value={newLog.digicode} onChange={e=>nl('digicode',e.target.value)}/></div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
                  <div><label className="input-label">Nom locataire</label><input className="input" value={newLog.nom_locataire} onChange={e=>nl('nom_locataire',e.target.value)}/></div>
                  <div><label className="input-label">Tel locataire</label><input className="input" value={newLog.telephone_loc} onChange={e=>nl('telephone_loc',e.target.value)}/></div>
                </div>
                <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowAddLog(false)}>Annuler</button>
                  <button className="btn btn-primary btn-sm" onClick={addLogement}>Ajouter</button>
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* Vue bâtiment → liste des logements */}
      {view?.type === 'batiment' && (
        <div>
          <div style={{ ...S.card, marginBottom:16 }}>
            <div style={{ color:'#fff', fontWeight:600, fontSize:'1rem' }}>{view.adresse}</div>
            <div style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.4)', marginTop:4 }}>{view.logements?.[0]?.code_postal} {view.logements?.[0]?.ville}</div>
          </div>
          {(view.logements || []).map(log => (
            <div key={log.id} style={{ ...S.card, cursor:'pointer' }} onClick={() => openLogement(log.id)}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ color:'#fff', fontWeight:700, fontSize:'0.92rem' }}>{log.nom_locataire || 'Sans locataire'}</div>
                  <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.4)', marginTop:3 }}>
                    {log.etage ? 'Et.' + log.etage : ''}{log.numero_porte ? ' P.' + log.numero_porte : ''}
                    {(log.etage || log.numero_porte) && log.telephone_loc ? ' - ' : ''}{log.telephone_loc || ''}
                  </div>
                </div>
                <span style={{ color:'rgba(255,255,255,0.3)' }}>&#8594;</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Vue logement */}
      {view?.type === 'logement' && (
        <div>
          <div style={{ ...S.card, marginBottom:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div style={{ color:'#fff', fontWeight:700, fontSize:'1rem' }}>{view.data?.nom_locataire || 'Sans locataire'}</div>
                <div style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.5)', marginTop:4 }}>
                  {view.data?.adresse}{view.data?.etage ? ' - Et.' + view.data.etage : ''}{view.data?.numero_porte ? ' P.' + view.data.numero_porte : ''}
                </div>
                <div style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.4)', marginTop:2 }}>
                  {view.data?.code_postal} {view.data?.ville}{view.data?.digicode ? ' | Code: ' + view.data.digicode : ''}
                </div>
                {view.data?.telephone_loc && <div style={{ fontSize:'0.82rem', color:'rgba(255,255,255,0.4)', marginTop:2 }}>{view.data.telephone_loc}</div>}
              </div>
              <button className="btn btn-secondary btn-sm"
                onClick={() => { setEditing({ type:'logement', data:view.data }); setEditForm({ ...view.data }) }}>Modifier</button>
            </div>
          </div>
          <div style={{ fontSize:'0.8rem', fontWeight:700, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:10 }}>
            Interventions ({(view.interventions||[]).length})
          </div>
          {(view.interventions||[]).length === 0 && (
            <div style={{ textAlign:'center', color:'rgba(255,255,255,0.2)', padding:'24px 0', fontSize:'0.85rem' }}>Aucune intervention</div>
          )}
          {(view.interventions||[]).map(inter => (
            <div key={inter.id} style={{ ...S.card, padding:'12px 16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ color:'#fff', fontSize:'0.88rem', fontWeight:500 }}>
                    {inter.type?.toUpperCase()} - {new Date(inter.date_prevue).toLocaleDateString('fr-FR')}
                    {inter.heure_prevue ? ' a ' + inter.heure_prevue.slice(0,5) : ''}
                  </div>
                  <div style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.4)', marginTop:2 }}>
                    {inter.tech_prenom ? inter.tech_prenom + ' ' + inter.tech_nom : 'Non assigne'}
                  </div>
                </div>
                <span className={'badge badge-' + inter.statut} style={{ fontSize:'0.7rem' }}>{inter.statut?.replace('_',' ')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal suppression */}
      {confirmDelete && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1100, backdropFilter:'blur(4px)' }}>
          <div style={{ background:'#1e2d42', border:'1px solid rgba(255,255,255,0.1)', borderRadius:16, width:420, padding:28 }} className="anim-fade-up">
            <div style={{ color:'#fff', fontWeight:600, fontSize:'1rem', marginBottom:10 }}>Supprimer le client</div>
            <div style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.88rem', marginBottom:24 }}>
              Supprimer <strong style={{ color:'#fff' }}>{confirmDelete.nom}</strong> et toutes ses donnees ? Cette action est irreversible.
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
              <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>Annuler</button>
              <button className="btn btn-danger" onClick={doDelete}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal edition */}
      {editing && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, backdropFilter:'blur(4px)' }}
          onClick={e => e.target === e.currentTarget && setEditing(null)}>
          <div style={{ background:'#1e2d42', border:'1px solid rgba(255,255,255,0.1)', borderRadius:16, width:520, padding:28, maxHeight:'90vh', overflowY:'auto' }} className="anim-fade-up">
            <h2 style={{ color:'#fff', marginBottom:20, fontSize:'1.05rem' }}>
              {editing.type === 'logement' ? 'Modifier le logement' : 'Modifier le client'}
            </h2>
            {editing.type === 'client' && (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div><label className="input-label">Nom</label><input className="input" value={editForm.nom||''} onChange={e=>ef('nom',e.target.value)}/></div>
                  <div><label className="input-label">Prenom</label><input className="input" value={editForm.prenom||''} onChange={e=>ef('prenom',e.target.value)}/></div>
                </div>
                <div><label className="input-label">Telephone</label><input className="input" value={editForm.telephone||''} onChange={e=>ef('telephone',e.target.value)}/></div>
              </div>
            )}
            {editing.type === 'particulier' && (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ fontSize:'0.72rem', fontWeight:700, color:'var(--green)', textTransform:'uppercase', letterSpacing:'0.1em' }}>Identite</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div><label className="input-label">Nom</label><input className="input" value={editForm.nom||''} onChange={e=>ef('nom',e.target.value)}/></div>
                  <div><label className="input-label">Prenom</label><input className="input" value={editForm.prenom||''} onChange={e=>ef('prenom',e.target.value)}/></div>
                </div>
                <div><label className="input-label">Telephone</label><input className="input" value={editForm.client_tel||''} onChange={e=>ef('client_tel',e.target.value)}/></div>
                <div style={{ fontSize:'0.72rem', fontWeight:700, color:'var(--green)', textTransform:'uppercase', letterSpacing:'0.1em', marginTop:8 }}>Logement</div>
                <div><label className="input-label">Adresse</label><input className="input" value={editForm.adresse||''} onChange={e=>ef('adresse',e.target.value)}/></div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:10 }}>
                  <div><label className="input-label">Ville</label><input className="input" value={editForm.ville||''} onChange={e=>ef('ville',e.target.value)}/></div>
                  <div><label className="input-label">CP</label><input className="input" style={{ width:90 }} value={editForm.code_postal||''} onChange={e=>ef('code_postal',e.target.value)}/></div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                  <div><label className="input-label">Etage</label><input className="input" value={editForm.etage||''} onChange={e=>ef('etage',e.target.value)}/></div>
                  <div><label className="input-label">Porte</label><input className="input" value={editForm.numero_porte||''} onChange={e=>ef('numero_porte',e.target.value)}/></div>
                  <div><label className="input-label">Digicode</label><input className="input" value={editForm.digicode||''} onChange={e=>ef('digicode',e.target.value)}/></div>
                </div>
              </div>
            )}
            {editing.type === 'logement' && (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div><label className="input-label">Adresse</label><input className="input" value={editForm.adresse||''} onChange={e=>ef('adresse',e.target.value)}/></div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:10 }}>
                  <div><label className="input-label">Ville</label><input className="input" value={editForm.ville||''} onChange={e=>ef('ville',e.target.value)}/></div>
                  <div><label className="input-label">CP</label><input className="input" style={{ width:90 }} value={editForm.code_postal||''} onChange={e=>ef('code_postal',e.target.value)}/></div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                  <div><label className="input-label">Etage</label><input className="input" value={editForm.etage||''} onChange={e=>ef('etage',e.target.value)}/></div>
                  <div><label className="input-label">Porte</label><input className="input" value={editForm.numero_porte||''} onChange={e=>ef('numero_porte',e.target.value)}/></div>
                  <div><label className="input-label">Digicode</label><input className="input" value={editForm.digicode||''} onChange={e=>ef('digicode',e.target.value)}/></div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div><label className="input-label">Nom locataire</label><input className="input" value={editForm.nom_locataire||''} onChange={e=>ef('nom_locataire',e.target.value)}/></div>
                  <div><label className="input-label">Tel locataire</label><input className="input" value={editForm.telephone_loc||''} onChange={e=>ef('telephone_loc',e.target.value)}/></div>
                </div>
              </div>
            )}
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:20 }}>
              <button className="btn btn-secondary" onClick={() => setEditing(null)}>Annuler</button>
              <button className="btn btn-primary" onClick={saveEdit} disabled={savingEdit}>
                {savingEdit ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InterventionsLogement({ logId, S }) {
  const [inters, setInters] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!logId) { setLoading(false); return }
    setLoading(true)
    api.get('/interventions?logement_id=' + logId + '&limit=50')
      .then(r => setInters(r.data.data || []))
      .catch(() => setInters([]))
      .finally(() => setLoading(false))
  }, [logId])
  if (loading) return <div style={{ display:'flex', justifyContent:'center', padding:20 }}><span className="loader" style={{ width:16, height:16 }}/></div>
  if (inters.length === 0) return <div style={{ textAlign:'center', color:'rgba(255,255,255,0.2)', padding:'16px 0', fontSize:'0.85rem' }}>Aucune intervention</div>
  return (
    <div>
      {inters.map(inter => (
        <div key={inter.id} style={{ ...S.card, padding:'12px 16px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ color:'#fff', fontSize:'0.88rem', fontWeight:500 }}>
                {inter.type?.toUpperCase()} - {new Date(inter.date_prevue).toLocaleDateString('fr-FR')}
              </div>
              <div style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.4)', marginTop:2 }}>
                {inter.tech_prenom ? inter.tech_prenom + ' ' + inter.tech_nom : 'Non assigne'}
              </div>
            </div>
            <span className={'badge badge-' + inter.statut} style={{ fontSize:'0.7rem' }}>{inter.statut?.replace('_',' ')}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
