import { useState, useEffect } from 'react'
import api from '../api.js'

export default function Clients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState('')

  useEffect(() => {
    const load = async () => {
      try { const {data} = await api.get('/clients'); setClients(data) } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const filtered = clients.filter(c =>
    !filter ||
    c.nom?.toLowerCase().includes(filter.toLowerCase()) ||
    c.prenom?.toLowerCase().includes(filter.toLowerCase())
  )

  const typeColor = { particulier: 'var(--green)', bailleur: 'var(--gold)', pro: '#8b5cf6' }
  const typeLabel = { particulier: 'Particulier', bailleur: 'Bailleur', pro: 'Pro' }

  return (
    <div style={{padding:'32px 36px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <h1 style={{fontSize:'1.5rem',fontWeight:600,color:'#fff'}}>
          Clients <span style={{fontSize:'0.9rem',color:'rgba(255,255,255,0.3)',fontWeight:400}}>({clients.length})</span>
        </h1>
        <input className="input" placeholder="Rechercher..." value={filter}
          onChange={e=>setFilter(e.target.value)} style={{maxWidth:240}}/>
      </div>
      {loading
        ? <div style={{display:'flex',justifyContent:'center',padding:60}}><span className="loader"/></div>
        : (
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            {filtered.length===0 && (
              <div style={{textAlign:'center',color:'rgba(255,255,255,0.25)',padding:'60px 0'}}>Aucun client trouve</div>
            )}
            {filtered.map((c,i) => (
              <div key={c.id} className="anim-fade-up"
                style={{animationDelay: i*0.03+'s', display:'flex', alignItems:'center', gap:16,
                  background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)',
                  borderRadius:10, padding:'14px 18px'}}>
                <div style={{
                  width:36, height:36, borderRadius:'50%', flexShrink:0,
                  background: typeColor[c.type] + '22',
                  border: '1px solid ' + typeColor[c.type] + '44',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:'0.85rem', fontWeight:700, color: typeColor[c.type]
                }}>
                  {(c.nom||'?')[0].toUpperCase()}
                </div>
                <div style={{flex:1}}>
                  <div style={{color:'#fff',fontWeight:600,fontSize:'0.9rem'}}>{c.nom} {c.prenom||''}</div>
                  <div style={{fontSize:'0.78rem',color:'rgba(255,255,255,0.35)'}}>{c.email}</div>
                </div>
                <span style={{fontSize:'0.72rem',fontWeight:600,color:typeColor[c.type],
                  background:typeColor[c.type]+'18',padding:'3px 10px',borderRadius:20}}>
                  {typeLabel[c.type]||c.type}
                </span>
                {c.telephone && (
                  <span style={{fontSize:'0.83rem',color:'rgba(255,255,255,0.4)'}}>{c.telephone}</span>
                )}
              </div>
            ))}
          </div>
        )
      }
    </div>
  )
}
