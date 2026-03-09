import { useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import api from '../api.js'

export default function ModalProfil({ onClose }) {
  const { user, setUser } = useAuth()
  const [form, setForm] = useState({
    prenom: user?.prenom || '',
    nom: user?.nom || '',
    password: '',
    password2: '',
  })
  const [photo, setPhoto]     = useState(user?.photo || null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  const fileRef = useRef(null)
  const set = (k,v) => setForm(f => ({...f, [k]: v}))

  const handlePhoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setPhoto(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    setError(''); setSuccess('')
    if (form.password && form.password !== form.password2) {
      setError('Les mots de passe ne correspondent pas'); return
    }
    setLoading(true)
    try {
      await api.patch('/users/me', { prenom: form.prenom, nom: form.nom })

      if (photo && photo !== user?.photo) {
        await api.patch('/users/me/photo', { photo })
      }

      if (form.password) {
        await api.patch('/users/me/password', { current: form.password, nouveau: form.password2 })
      }

      // Mettre à jour le contexte ET le localStorage
      setUser(u => ({ ...u, prenom: form.prenom, nom: form.nom, photo: photo || u?.photo }))
      setSuccess('Profil mis a jour')
      setForm(f => ({ ...f, password: '', password2: '' }))
    } catch(e) {
      setError(e.response?.data?.error || 'Erreur lors de la mise a jour')
    }
    setLoading(false)
  }

  const initials = (form.prenom?.[0] || '') + (form.nom?.[0] || '')

  return (
    <div style={S.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modal} className="anim-fade-up">
        <div style={S.header}>
          <h2 style={S.title}>Mon profil</h2>
          <button onClick={onClose} style={S.close}>✕</button>
        </div>
        <div style={S.body}>
          {/* Avatar cliquable */}
          <div style={S.avatarArea}>
            <div style={{ position:'relative', flexShrink:0 }} onClick={() => fileRef.current?.click()} title="Changer la photo">
              {photo
                ? <img src={photo} alt="profil" style={{ width:56, height:56, borderRadius:'50%', objectFit:'cover', cursor:'pointer', border:'2px solid var(--green)' }}/>
                : <div style={{ ...S.avatar, cursor:'pointer' }}>{initials}</div>
              }
              <div style={{ position:'absolute', bottom:0, right:0, width:18, height:18, borderRadius:'50%', background:'var(--green)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.6rem', color:'#fff', cursor:'pointer' }}>✎</div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handlePhoto}/>
            <div>
              <div style={{ color:'#fff', fontWeight:600, fontSize:'1rem' }}>{form.prenom} {form.nom}</div>
              <div style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.35)', textTransform:'capitalize' }}>{user?.role}</div>
              <div style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.25)', marginTop:2 }}>{user?.email}</div>
            </div>
          </div>

          <div style={S.grid}>
            <div>
              <label className="input-label">Prenom</label>
              <input className="input" value={form.prenom} onChange={e=>set('prenom',e.target.value)}/>
            </div>
            <div>
              <label className="input-label">Nom</label>
              <input className="input" value={form.nom} onChange={e=>set('nom',e.target.value)}/>
            </div>
          </div>

          <div style={{ borderTop:'1px solid rgba(255,255,255,0.08)', paddingTop:16, marginTop:4 }}>
            <div style={{ fontSize:'0.78rem', fontWeight:700, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12 }}>Changer le mot de passe</div>
            <div style={S.grid}>
              <div>
                <label className="input-label">Nouveau mot de passe</label>
                <input className="input" type="password" value={form.password} onChange={e=>set('password',e.target.value)} placeholder="Laisser vide pour ne pas changer"/>
              </div>
              <div>
                <label className="input-label">Confirmer</label>
                <input className="input" type="password" value={form.password2} onChange={e=>set('password2',e.target.value)}/>
              </div>
            </div>
          </div>

          {error   && <div style={S.error}>{error}</div>}
          {success && <div style={S.successMsg}>{success}</div>}
        </div>
        <div style={S.footer}>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? <><span className="loader" style={{ width:14, height:14 }}/> Sauvegarde...</> : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  )
}

const S = {
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000, backdropFilter:'blur(4px)' },
  modal: { background:'#1a2535', border:'1px solid rgba(255,255,255,0.1)', borderRadius:16, width:'95%', maxWidth:520, display:'flex', flexDirection:'column' },
  header: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'18px 24px', borderBottom:'1px solid rgba(255,255,255,0.08)' },
  title: { fontSize:'1.1rem', fontWeight:600, color:'#fff' },
  close: { background:'none', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:'1.1rem', padding:4 },
  body: { padding:24, display:'flex', flexDirection:'column', gap:16, overflowY:'auto', maxHeight:'70vh' },
  footer: { padding:'14px 24px', borderTop:'1px solid rgba(255,255,255,0.08)', display:'flex', justifyContent:'flex-end', gap:12 },
  avatarArea: { display:'flex', alignItems:'center', gap:16, padding:'12px 16px', background:'rgba(255,255,255,0.04)', borderRadius:10 },
  avatar: { width:56, height:56, borderRadius:'50%', background:'var(--green)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem', fontWeight:700 },
  grid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 },
  error: { background:'rgba(231,76,60,0.12)', border:'1px solid rgba(231,76,60,0.3)', borderRadius:8, padding:'10px 14px', color:'#e74c3c', fontSize:'0.875rem' },
  successMsg: { background:'rgba(74,184,64,0.1)', border:'1px solid rgba(74,184,64,0.3)', borderRadius:8, padding:'10px 14px', color:'var(--green)', fontSize:'0.875rem' },
}
