// Rapports.jsx
import { useState, useEffect } from 'react'
import api from '../api.js'

export default function Rapports() {
  const [interventions, setInterventions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [rapport, setRapport] = useState(null)
  const [loadingRapport, setLoadingRapport] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const {data} = await api.get('/interventions?statut=terminee&limit=100')
        setInterventions(data.data)
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  const openRapport = async (inter) => {
    setSelected(inter); setLoadingRapport(true); setRapport(null)
    try { const {data} = await api.get(`/rapports/${inter.id}`); setRapport(data) } catch {}
    setLoadingRapport(false)
  }

  const exportCSV = async () => {
    try {
      const res = await api.get('/export/interventions?format=csv', {responseType:'blob'})
      const url = URL.createObjectURL(res.data)
      const a   = document.createElement('a'); a.href=url; a.download=`interventions-${new Date().toISOString().split('T')[0]}.csv`; a.click()
    } catch {}
  }

  return (
    <div style={{padding:'32px 36px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <h1 style={{fontSize:'1.5rem',fontWeight:600,color:'#fff'}}>Rapports</h1>
        <button className="btn btn-secondary" onClick={exportCSV}>📥 Exporter CSV</button>
      </div>
      {loading ? <div style={{display:'flex',justifyContent:'center',padding:60}}><span className="loader"/></div> : (
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {interventions.length===0 && <div style={{textAlign:'center',color:'rgba(255,255,255,0.25)',padding:'60px 0'}}>Aucun rapport disponible</div>}
          {interventions.map((i,idx) => (
            <div key={i.id} className="anim-fade-up" style={{animationDelay:`${idx*0.03}s`,display:'flex',alignItems:'center',gap:16,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,padding:'14px 18px',cursor:'pointer'}} onClick={()=>openRapport(i)}>
              <div style={{minWidth:80,fontSize:'0.83rem',color:'rgba(255,255,255,0.4)'}}>{new Date(i.date_prevue).toLocaleDateString('fr-FR')}</div>
              <span style={{fontSize:'0.72rem',fontWeight:700,color:'var(--green)',background:'rgba(74,184,64,0.1)',padding:'3px 8px',borderRadius:4}}>{i.type?.toUpperCase()}</span>
              <div style={{flex:1}}>
                <div style={{color:'#fff',fontWeight:500,fontSize:'0.9rem'}}>{i.adresse}, {i.ville}</div>
                {i.nom_locataire && <div style={{fontSize:'0.78rem',color:'rgba(255,255,255,0.35)'}}>{i.nom_locataire}</div>}
              </div>
              {i.tech_nom && <div style={{fontSize:'0.83rem',color:'rgba(255,255,255,0.4)'}}>{i.tech_prenom} {i.tech_nom}</div>}
              <span style={{fontSize:'0.8rem',color:'var(--green)'}}>📋 Voir →</span>
            </div>
          ))}
        </div>
      )}
      {selected && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,backdropFilter:'blur(4px)'}} onClick={e=>e.target===e.currentTarget&&setSelected(null)}>
          <div style={{background:'#1e2d42',border:'1px solid rgba(255,255,255,0.1)',borderRadius:16,width:'90%',maxWidth:640,maxHeight:'85vh',display:'flex',flexDirection:'column'}} className="anim-fade-up">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'20px 24px',borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
              <h2 style={{color:'#fff',fontSize:'1.05rem'}}>Rapport — {selected.adresse}</h2>
              <button onClick={()=>setSelected(null)} style={{background:'none',border:'none',color:'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:'1.1rem'}}>✕</button>
            </div>
            <div style={{padding:24,overflowY:'auto',flex:1}}>
              {loadingRapport ? <div style={{display:'flex',justifyContent:'center',padding:40}}><span className="loader"/></div> :
               !rapport ? <div style={{color:'rgba(255,255,255,0.3)',textAlign:'center',padding:40}}>Rapport non trouvé</div> : (
                <div style={{display:'flex',flexDirection:'column',gap:16}}>
                  {[['Heure début', rapport.heure_debut ? new Date(rapport.heure_debut).toLocaleTimeString('fr-FR') : '—'],
                    ['Heure fin', rapport.heure_fin ? new Date(rapport.heure_fin).toLocaleTimeString('fr-FR') : '—'],
                    ['État équipement', rapport.statut_equipement || '—'],
                    ['Travaux effectués', rapport.travaux_effectues || '—'],
                    ['Fournitures', rapport.fournitures || '—'],
                    ['Remarques', rapport.remarques || '—'],
                  ].map(([l,v]) => (
                    <div key={l} style={{display:'flex',gap:12}}>
                      <div style={{minWidth:140,fontSize:'0.78rem',color:'rgba(255,255,255,0.35)',paddingTop:2}}>{l}</div>
                      <div style={{color:'rgba(255,255,255,0.8)',fontSize:'0.875rem',flex:1}}>{v}</div>
                    </div>
                  ))}
                  {rapport.champs && Object.keys(rapport.champs).length > 0 && (
                    <div style={{borderTop:'1px solid rgba(255,255,255,0.08)',paddingTop:16,marginTop:4}}>
                      <div style={{fontSize:'0.75rem',color:'var(--green)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:12}}>Champs spécifiques</div>
                      {Object.entries(rapport.champs).map(([k,v]) => (
                        <div key={k} style={{display:'flex',gap:12,marginBottom:8}}>
                          <div style={{minWidth:140,fontSize:'0.78rem',color:'rgba(255,255,255,0.35)',paddingTop:2}}>{k.replace(/_/g,' ')}</div>
                          <div style={{color:'rgba(255,255,255,0.8)',fontSize:'0.875rem'}}>{v}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {rapport.photos?.length > 0 && (
                    <div style={{borderTop:'1px solid rgba(255,255,255,0.08)',paddingTop:16}}>
                      <div style={{fontSize:'0.75rem',color:'var(--green)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:12}}>Photos ({rapport.photos.length})</div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                        {rapport.photos.map(p => (
                          <img key={p.id} src={`http://212.227.39.223${p.chemin}`} style={{width:120,height:90,objectFit:'cover',borderRadius:6,border:'1px solid rgba(255,255,255,0.1)'}}/>
                        ))}
                      </div>
                    </div>
                  )}
                  {rapport.signature && (
                    <div style={{borderTop:'1px solid rgba(255,255,255,0.08)',paddingTop:16}}>
                      <div style={{fontSize:'0.75rem',color:'var(--green)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8}}>Signature</div>
                      <div style={{fontSize:'0.83rem',color:'rgba(255,255,255,0.5)',marginBottom:8}}>Signé par : {rapport.signature.signataire_nom || '—'}</div>
                      <img src={`http://212.227.39.223${rapport.signature.data_base64}`} style={{maxWidth:200,background:'#fff',borderRadius:6,padding:4}}/>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
