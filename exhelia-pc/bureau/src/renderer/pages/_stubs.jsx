// pages/Planning.jsx
import { useState, useEffect } from 'react'
import api from '../api.js'

export { default as Planning } from './PlanningFull.jsx'

// pages/Techniciens.jsx  
import { useState, useEffect } from 'react'
import api from '../api.js'

export function Techniciens() {
  const [techniciens, setTechniciens] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ email:'', password:'', nom:'', prenom:'', telephone:'' })
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])
  const load = async () => {
    try { const {data} = await api.get('/techniciens'); setTechniciens(data) } catch {}
    setLoading(false)
  }

  const create = async () => {
    try {
      await api.post('/techniciens', form)
      setShowModal(false); setForm({email:'',password:'',nom:'',prenom:'',telephone:''})
      load()
    } catch(e) { setError(e.response?.data?.error || 'Erreur') }
  }

  return (
    <div style={{padding:'32px 36px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <h1 style={{fontSize:'1.5rem',fontWeight:600,color:'#fff'}}>Techniciens</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Ajouter</button>
      </div>
      {loading ? <div style={{display:'flex',justifyContent:'center',padding:60}}><span className="loader"/></div> : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16}}>
          {techniciens.map(t => (
            <div key={t.id} className="card anim-fade-up">
              <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:12}}>
                <div style={{width:44,height:44,borderRadius:'50%',background:'var(--green)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:700,fontSize:'1rem'}}>
                  {t.prenom?.[0]}{t.nom?.[0]}
                </div>
                <div>
                  <div style={{color:'#fff',fontWeight:600}}>{t.prenom} {t.nom}</div>
                  <div style={{fontSize:'0.78rem',color:'rgba(255,255,255,0.35)'}}>{t.email}</div>
                </div>
              </div>
              {t.telephone && <div style={{fontSize:'0.85rem',color:'rgba(255,255,255,0.5)'}}>📞 {t.telephone}</div>}
              <div style={{fontSize:'0.75rem',color:'rgba(255,255,255,0.25)',marginTop:8}}>
                Dernière co. : {t.last_login ? new Date(t.last_login).toLocaleDateString('fr-FR') : 'Jamais'}
              </div>
            </div>
          ))}
        </div>
      )}
      {showModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}} onClick={e => e.target===e.currentTarget&&setShowModal(false)}>
          <div style={{background:'#1e2d42',border:'1px solid rgba(255,255,255,0.1)',borderRadius:16,width:460,padding:32}} className="anim-fade-up">
            <h2 style={{color:'#fff',marginBottom:24}}>Nouveau technicien</h2>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {[['email','Email *','email'],['password','Mot de passe *','password'],['nom','Nom *','text'],['prenom','Prénom *','text'],['telephone','Téléphone','tel']].map(([k,l,t]) => (
                <div key={k}>
                  <label className="input-label">{l}</label>
                  <input className="input" type={t} value={form[k]} onChange={e => setForm(f=>({...f,[k]:e.target.value}))}/>
                </div>
              ))}
              {error && <div style={{color:'var(--danger)',fontSize:'0.875rem'}}>⚠ {error}</div>}
              <div style={{display:'flex',justifyContent:'flex-end',gap:12,marginTop:8}}>
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                <button className="btn btn-primary" onClick={create}>Créer</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
