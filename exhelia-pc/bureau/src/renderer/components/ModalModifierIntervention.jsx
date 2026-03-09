import { useState, useEffect, useRef } from 'react'
import api from '../api.js'

const INTER_TYPES = ['vmc','pac','solaire','chaudiere','ventilation','climatisation','autre']
const STATUTS     = ['planifiee','en_cours','terminee','annulee']
const DEFAULT_DURATIONS = { vmc:60, pac:120, solaire:180, chaudiere:90, ventilation:60, climatisation:120, autre:60 }

function addMinutes(t, min) {
  if (!t || !t.includes(':')) return ''
  const [h,m] = t.split(':').map(Number)
  const tot = h*60+m+min
  return String(Math.floor(tot/60)%24).padStart(2,'0')+':'+String(tot%60).padStart(2,'0')
}


// ── Helpers ──
function parseDate(ddmmyyyy) {
  if (!ddmmyyyy || !ddmmyyyy.includes('/')) return ''
  const [day, mon, yr] = ddmmyyyy.split('/')
  if (!yr || yr.length < 4) return ''
  return yr + '-' + mon.padStart(2,'0') + '-' + day.padStart(2,'0')
}
function toDisplay(iso) {
  if (!iso) return ''
  const [y,m,day] = iso.split('T')[0].split('-')
  return day + '/' + m + '/' + y
}

// ── Saisie heure : auto-pad heures ET minutes ──
function handleHeureInput(val) {
  let v = val.replace(/[^0-9]/g,'')
  if (v.length > 4) v = v.slice(0,4)
  // Auto-pad heure : 1er chiffre >= 3 → 0x
  if (v.length === 1 && parseInt(v) >= 3) return '0' + v + ':'
  // Auto-pad minute : après ':', si 1er chiffre minute >= 6 → 0x
  if (v.length === 3) {
    const minuteFirst = parseInt(v[2])
    if (minuteFirst >= 6) return v.slice(0,2) + ':0' + v[2]
  }
  if (v.length >= 3) return v.slice(0,2) + ':' + v.slice(2)
  return v
}

// ── Saisie date : ne casse pas les autres segments ──
function handleDateInput(prev, next) {
  const prevD = prev.replace(/\D/g,'')
  const nextD = next.replace(/\D/g,'')
  if (nextD.length < prevD.length) {
    const d = nextD
    if (d.length === 0) return ''
    if (d.length <= 2) return d
    if (d.length <= 4) return d.slice(0,2) + '/' + d.slice(2)
    return d.slice(0,2) + '/' + d.slice(2,4) + '/' + d.slice(4,8)
  }
  return smartDate(prev, next)
}

function smartDate(prev, next) {
  const rawDigits = next.replace(/\D/g,'')
  const prevDigits = prev.replace(/\D/g,'')
  if (rawDigits.length < prevDigits.length) {
    const d = rawDigits
    if (d.length <= 2) return d
    if (d.length <= 4) return d.slice(0,2) + '/' + d.slice(2)
    return d.slice(0,2) + '/' + d.slice(2,4) + '/' + d.slice(4)
  }
  let d = rawDigits.slice(0,8)
  const nowYear = new Date().getFullYear().toString()
  if (!d.length) return ''
  let result = ''
  if (d.length === 1) { return parseInt(d[0]) >= 4 ? '0' + d[0] + '/' : d[0] }
  const j12 = parseInt(d.slice(0,2))
  if (j12 > 31) { result = '0' + d[0] + '/'; d = d.slice(1) }
  else { result = d.slice(0,2) + '/'; d = d.slice(2) }
  if (!d.length) return result.replace(/\/$/, '')
  if (d.length === 1) { return result + (parseInt(d[0]) >= 2 ? '0' + d[0] + '/' : d[0]) }
  const m12 = parseInt(d.slice(0,2))
  let r2 = ''
  if (m12 > 12) { r2 = '0' + d[0] + '/'; d = d.slice(1) }
  else { r2 = d.slice(0,2) + '/'; d = d.slice(2) }
  if (!d.length) return result + r2.replace(/\/$/, '')
  return result + r2 + d.slice(0,4)
}

// ── Calendrier ──
function DatePickerPopup({ value, onChange, onClose }) {
  const today = new Date()
  const [dp, setDp] = useState(() => {
    if (value && value.includes('/')) {
      const [d,m,y] = value.split('/')
      const dt = new Date(parseInt(y), parseInt(m)-1, parseInt(d))
      return isNaN(dt.getTime()) ? new Date() : dt
    }
    return new Date()
  })
  const year = dp.getFullYear(), month = dp.getMonth()
  const firstDay = new Date(year,month,1).getDay()
  const daysInMonth = new Date(year,month+1,0).getDate()
  const startOffset = firstDay===0?6:firstDay-1
  const months=['Jan','Fev','Mar','Avr','Mai','Jun','Jul','Aou','Sep','Oct','Nov','Dec']
  const days=['L','M','M','J','V','S','D']
  const selectedDay = (() => {
    if (value && value.includes('/')) {
      const [d,m,y] = value.split('/')
      if (parseInt(y)===year && parseInt(m)-1===month) return parseInt(d)
    }
    return null
  })()
  const cells = []
  for(let i=0;i<startOffset;i++) cells.push(null)
  for(let i=1;i<=daysInMonth;i++) cells.push(i)
  while(cells.length%7!==0) cells.push(null)
  return (
    <div style={{position:'absolute',zIndex:500,top:'100%',left:0,marginTop:4,background:'#1e2d42',border:'1px solid rgba(255,255,255,0.12)',borderRadius:12,padding:14,boxShadow:'0 8px 32px rgba(0,0,0,0.6)',width:240}} onClick={e=>e.stopPropagation()}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <button onClick={()=>setDp(new Date(year,month-1,1))} style={{background:'none',border:'none',color:'rgba(255,255,255,0.6)',cursor:'pointer',fontSize:'1rem',padding:'2px 8px'}}>&#8249;</button>
        <span style={{color:'#fff',fontSize:'0.85rem',fontWeight:600}}>{months[month]} {year}</span>
        <button onClick={()=>setDp(new Date(year,month+1,1))} style={{background:'none',border:'none',color:'rgba(255,255,255,0.6)',cursor:'pointer',fontSize:'1rem',padding:'2px 8px'}}>&#8250;</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:4}}>
        {days.map((d,i)=><div key={i} style={{textAlign:'center',fontSize:'0.65rem',color:'rgba(255,255,255,0.3)',padding:'2px 0'}}>{d}</div>)}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
        {cells.map((d,i)=>{
          if(!d) return <div key={i}/>
          const isToday=d===today.getDate()&&month===today.getMonth()&&year===today.getFullYear()
          const isSel=d===selectedDay
          return <div key={i} onClick={()=>{onChange(String(d).padStart(2,'0')+'/'+String(month+1).padStart(2,'0')+'/'+year);onClose()}} style={{textAlign:'center',padding:'5px 2px',borderRadius:6,cursor:'pointer',fontSize:'0.78rem',background:isSel?'var(--green)':isToday?'rgba(74,184,64,0.15)':'transparent',color:isSel?'#fff':isToday?'var(--green)':'rgba(255,255,255,0.7)',fontWeight:isSel||isToday?600:400}}>{d}</div>
        })}
      </div>
    </div>
  )
}

// ── Horloge : heures 07-18, minutes 00-55 par pas de 5 ──
function TimePickerPopup({ value, onChange, onClose }) {
  const [h, setH] = useState(() => { if(value){const n=parseInt(value.split(':')[0]);return isNaN(n)?8:Math.min(18,Math.max(7,n))} return 8 })
  const [m, setM] = useState(() => { if(value){const n=parseInt(value.split(':')[1]);return isNaN(n)?0:Math.round(n/5)*5%60} return 0 })
  const hRef=useRef(null), mRef=useRef(null)
  const hours=Array.from({length:12},(_,i)=>i+7)
  const minutes=Array.from({length:12},(_,i)=>i*5)
  useEffect(()=>{
    if(hRef.current){const idx=hours.indexOf(h);if(idx>=0)hRef.current.scrollTop=idx*32-48}
    if(mRef.current){const idx=minutes.indexOf(m);if(idx>=0)mRef.current.scrollTop=idx*32-48}
  },[])
  return (
    <div style={{position:'absolute',zIndex:500,top:'100%',left:0,marginTop:4,background:'#1e2d42',border:'1px solid rgba(255,255,255,0.12)',borderRadius:12,padding:'10px 14px',boxShadow:'0 8px 32px rgba(0,0,0,0.6)',width:190}} onClick={e=>e.stopPropagation()}>
      <div style={{fontSize:'1.1rem',fontWeight:700,color:'var(--green)',textAlign:'center',marginBottom:8}}>
        {String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}
      </div>
      <div style={{display:'flex',gap:8,marginBottom:10}}>
        <div style={{flex:1}}>
          <div style={{fontSize:'0.65rem',color:'rgba(255,255,255,0.4)',marginBottom:4,textAlign:'center'}}>Heure</div>
          <div ref={hRef} style={{height:128,overflowY:'auto',display:'flex',flexDirection:'column',gap:1}}>
            {hours.map(hh=>(
              <div key={hh} onClick={()=>setH(hh)} style={{textAlign:'center',padding:'5px 0',borderRadius:6,cursor:'pointer',fontSize:'0.82rem',flexShrink:0,background:hh===h?'var(--green)':'transparent',color:hh===h?'#fff':'rgba(255,255,255,0.6)',fontWeight:hh===h?600:400}}>
                {String(hh).padStart(2,'0')}
              </div>
            ))}
          </div>
        </div>
        <div style={{width:1,background:'rgba(255,255,255,0.08)'}}/>
        <div style={{flex:1}}>
          <div style={{fontSize:'0.65rem',color:'rgba(255,255,255,0.4)',marginBottom:4,textAlign:'center'}}>Min</div>
          <div ref={mRef} style={{height:128,overflowY:'auto',display:'flex',flexDirection:'column',gap:1}}>
            {minutes.map(mm=>(
              <div key={mm} onClick={()=>setM(mm)} style={{textAlign:'center',padding:'5px 0',borderRadius:6,cursor:'pointer',fontSize:'0.82rem',flexShrink:0,background:mm===m?'var(--green)':'transparent',color:mm===m?'#fff':'rgba(255,255,255,0.6)',fontWeight:mm===m?600:400}}>
                {String(mm).padStart(2,'0')}
              </div>
            ))}
          </div>
        </div>
      </div>
      <button className="btn btn-primary btn-sm" onClick={()=>{onChange(String(h).padStart(2,'0')+':'+String(m).padStart(2,'0'));onClose()}} style={{width:'100%',justifyContent:'center'}}>OK</button>
    </div>
  )
}

// ── Champ date ──
function DateField({ label, value, onChange }) {
  const [open,setOpen]=useState(false)
  const ref=useRef(null)
  useEffect(()=>{ const h=(e)=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)}; document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h) },[])
  return (
    <div ref={ref} style={{position:'relative'}}>
      <label className="input-label">{label}</label>
      <div style={{position:'relative'}}>
        <input className="input" placeholder="JJ/MM/AAAA" value={value} maxLength={10} onChange={e=>onChange(handleDateInput(value,e.target.value))} style={{paddingRight:36}}/>
        <span onClick={()=>setOpen(o=>!o)} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',cursor:'pointer',fontSize:'1rem',color:'rgba(255,255,255,0.4)',userSelect:'none'}}>&#128197;</span>
      </div>
      {open&&<DatePickerPopup value={value} onChange={v=>{onChange(v);setOpen(false)}} onClose={()=>setOpen(false)}/>}
    </div>
  )
}

// ── Champ heure ──
function TimeField({ label, value, onChange }) {
  const [open,setOpen]=useState(false)
  const ref=useRef(null)
  useEffect(()=>{ const h=(e)=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)}; document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h) },[])
  return (
    <div ref={ref} style={{position:'relative'}}>
      <label className="input-label">{label}</label>
      <div style={{position:'relative'}}>
        <input className="input" placeholder="08:00" value={value} maxLength={5} onChange={e=>onChange(handleHeureInput(e.target.value))} style={{paddingRight:36}}/>
        <span onClick={()=>setOpen(o=>!o)} style={{position:'absolute',right:10,top:'50%',transform:'translateY(-50%)',cursor:'pointer',fontSize:'1rem',color:'rgba(255,255,255,0.4)',userSelect:'none'}}>&#128336;</span>
      </div>
      {open&&<TimePickerPopup value={value} onChange={v=>{onChange(v);setOpen(false)}} onClose={()=>setOpen(false)}/>}
    </div>
  )
}


export default function ModalModifierIntervention({ intervention: inter, techniciens, onClose, onUpdated, onDeleted }) {
  const [mode, setMode]         = useState('edit')
  const [confirmDel, setConfirmDel] = useState(false)
  const [form, setForm] = useState({
    statut:        inter.statut || 'planifiee',
    technicien_id: inter.technicien_id || '',
    date_prevue:   toDisplay(inter.date_prevue),
    date_fin:      toDisplay(inter.date_fin),
    heure_prevue:  inter.heure_prevue?.slice(0,5) || '',
    heure_fin:     inter.heure_fin?.slice(0,5) || '',
    intervention:  inter.type || 'vmc',
    notes_bureau:  inter.notes_bureau || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  useEffect(() => {
    if (form.date_prevue && form.date_prevue.length===10) set('date_fin', form.date_prevue)
  }, [form.date_prevue])

  useEffect(() => {
    if (form.heure_prevue && form.heure_prevue.length===5)
      set('heure_fin', addMinutes(form.heure_prevue, DEFAULT_DURATIONS[form.intervention]||60))
  }, [form.heure_prevue, form.intervention])

  const handleSave = async () => {
    setError(''); setLoading(true)
    try {
      const date_prevue = parseDate(form.date_prevue)
      const date_fin    = parseDate(form.date_fin)
      if (!date_prevue) { setError('Date invalide'); setLoading(false); return }
      await api.patch('/interventions/' + inter.id, {
        statut: form.statut, technicien_id: form.technicien_id||null,
        date_prevue, date_fin: date_fin||null,
        heure_prevue: form.heure_prevue||null, heure_fin: form.heure_fin||null,
        type: form.intervention, notes_bureau: form.notes_bureau||null,
      })
      onUpdated()
    } catch(err) { setError(err.response?.data?.error || 'Erreur serveur') }
    setLoading(false)
  }

  const handleDelete = async () => {
    try { await api.delete('/interventions/' + inter.id); onDeleted() } catch {}
  }

  return (
    <div style={S.overlay} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={S.modal} className="anim-fade-up">

        {/* Header */}
        <div style={S.header}>
          <div>
            <h2 style={S.title}>Intervention — {inter.type?.toUpperCase()}</h2>
            <div style={{fontSize:'0.8rem',color:'rgba(255,255,255,0.4)',marginTop:3}}>
              {inter.adresse}{inter.ville?', '+inter.ville:''}{inter.code_postal?' ('+inter.code_postal+')':''}
              {inter.etage?' — Et. '+inter.etage:''}{inter.numero_porte?' — Porte '+inter.numero_porte:''}
              {inter.digicode?' — Code '+inter.digicode:''}
            </div>
            {inter.nom_locataire && (
              <div style={{fontSize:'0.78rem',color:'rgba(255,255,255,0.3)',marginTop:2}}>
                {inter.nom_locataire}{inter.telephone_loc?' — '+inter.telephone_loc:''}
              </div>
            )}
          </div>
          <button onClick={onClose} style={S.close}>&#x2715;</button>
        </div>

        {/* Onglets */}
        <div style={{display:'flex',borderBottom:'1px solid rgba(255,255,255,0.08)',flexShrink:0}}>
          {[['edit','Modifier'],['report','Reporter']].map(([m,label])=>(
            <button key={m} onClick={()=>setMode(m)} style={{background:'none',border:'none',padding:'12px 20px',cursor:'pointer',fontSize:'0.875rem',fontWeight:500,color:mode===m?'#fff':'rgba(255,255,255,0.35)',borderBottom:mode===m?'2px solid var(--green)':'2px solid transparent',transition:'all 0.15s'}}>{label}</button>
          ))}
        </div>

        {/* Corps */}
        <div style={S.body}>
          {mode === 'edit' && (
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                <div>
                  <label className="input-label">Type</label>
                  <select className="input" value={form.intervention} onChange={e=>set('intervention',e.target.value)} style={{colorScheme:'dark'}}>
                    {INTER_TYPES.map(t=><option key={t} value={t}>{t.toUpperCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="input-label">Statut</label>
                  <select className="input" value={form.statut} onChange={e=>set('statut',e.target.value)} style={{colorScheme:'dark'}}>
                    {STATUTS.map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}
                  </select>
                </div>
                <DateField label="Date debut" value={form.date_prevue} onChange={v=>set('date_prevue',v)}/>
                <DateField label="Date fin" value={form.date_fin} onChange={v=>set('date_fin',v)}/>
                <TimeField label="Heure debut" value={form.heure_prevue} onChange={v=>set('heure_prevue',v)}/>
                <TimeField label="Heure fin" value={form.heure_fin} onChange={v=>set('heure_fin',v)}/>
                <div style={{gridColumn:'1/-1'}}>
                  <label className="input-label">Technicien</label>
                  <select className="input" value={form.technicien_id} onChange={e=>set('technicien_id',e.target.value)} style={{colorScheme:'dark'}}>
                    <option value="">Non assigne</option>
                    {techniciens.map(t=><option key={t.id} value={t.id}>{t.prenom} {t.nom}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="input-label">Notes bureau</label>
                <textarea className="input" rows={3} value={form.notes_bureau} onChange={e=>set('notes_bureau',e.target.value)} style={{resize:'vertical'}}/>
              </div>
              {error && <div style={S.error}>{error}</div>}
            </div>
          )}
          {mode === 'report' && (
            <ReportForm inter={inter} techniciens={techniciens} onUpdated={onUpdated}/>
          )}
        </div>

        {/* Footer — toujours visible, contenu change selon onglet */}
        <div style={S.footer}>
          <button className="btn btn-danger btn-sm" onClick={()=>setConfirmDel(true)}>Supprimer</button>
          <div style={{flex:1}}/>
          {mode === 'edit' && (
            <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
              {loading?'Sauvegarde...':'Sauvegarder'}
            </button>
          )}
          {mode === 'report' && (
            <ReportConfirmBtn inter={inter} techniciens={techniciens} onUpdated={onUpdated}/>
          )}
        </div>
      </div>

      {/* Modal suppression */}
      {confirmDel && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1100,backdropFilter:'blur(4px)'}}>
          <div style={{background:'#1e2d42',border:'1px solid rgba(255,255,255,0.1)',borderRadius:16,width:400,padding:28}} className="anim-fade-up">
            <div style={{color:'#fff',fontWeight:600,fontSize:'1rem',marginBottom:10}}>Supprimer cette intervention</div>
            <div style={{color:'rgba(255,255,255,0.5)',fontSize:'0.88rem',marginBottom:24}}>Cette action est irreversible.</div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:10}}>
              <button className="btn btn-secondary" onClick={()=>setConfirmDel(false)}>Annuler</button>
              <button className="btn btn-danger" onClick={handleDelete}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Corps de Reporter (sans bouton — le bouton est dans le footer du modal parent)
function ReportForm({ inter, techniciens, onUpdated }) {
  const DEFAULT_DURATIONS = { vmc:60, pac:120, solaire:180, chaudiere:90, ventilation:60, climatisation:120, autre:60 }
  // On stocke form dans window pour que ReportConfirmBtn y accède
  const [form, setForm] = useState({ date_prevue:'', date_fin:'', heure_prevue:'', heure_fin:'', technicien_id: inter.technicien_id||'' })
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  // Exposer sur inter pour partage avec ReportConfirmBtn
  useEffect(() => { inter._reportForm = form }, [form])

  useEffect(() => {
    if (form.date_prevue && form.date_prevue.length===10) set('date_fin', form.date_prevue)
  }, [form.date_prevue])

  useEffect(() => {
    if (form.heure_prevue && form.heure_prevue.length===5) {
      const [h,m] = form.heure_prevue.split(':').map(Number)
      const tot = h*60+m+(DEFAULT_DURATIONS[inter.type]||60)
      set('heure_fin', String(Math.floor(tot/60)%24).padStart(2,'0')+':'+String(tot%60).padStart(2,'0'))
    }
  }, [form.heure_prevue])

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>
      <div style={{fontSize:'0.875rem',color:'rgba(255,255,255,0.5)',padding:'12px 14px',background:'rgba(212,168,67,0.08)',borderRadius:8,border:'1px solid rgba(212,168,67,0.2)'}}>
        Reporter a une nouvelle date. Le statut repassera a "planifiee".
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <DateField label="Nouvelle date debut *" value={form.date_prevue} onChange={v=>set('date_prevue',v)}/>
        <DateField label="Nouvelle date fin" value={form.date_fin} onChange={v=>set('date_fin',v)}/>
        <TimeField label="Heure debut" value={form.heure_prevue} onChange={v=>set('heure_prevue',v)}/>
        <TimeField label="Heure fin" value={form.heure_fin} onChange={v=>set('heure_fin',v)}/>
        <div style={{gridColumn:'1/-1'}}>
          <label className="input-label">Technicien</label>
          <select className="input" value={form.technicien_id} onChange={e=>set('technicien_id',e.target.value)} style={{colorScheme:'dark'}}>
            <option value="">Non assigne</option>
            {techniciens.map(t=><option key={t.id} value={t.id}>{t.prenom} {t.nom}</option>)}
          </select>
        </div>
      </div>
    </div>
  )
}

// Bouton Confirmer dans le footer — lit inter._reportForm
function ReportConfirmBtn({ inter, onUpdated }) {
  const [loading, setLoading] = useState(false)
  const handleReport = async () => {
    const form = inter._reportForm
    if (!form) return
    setLoading(true)
    const date_prevue = parseDate(form.date_prevue)
    if (!date_prevue) { setLoading(false); return }
    try {
      await api.patch('/interventions/'+inter.id, {
        date_prevue, date_fin:parseDate(form.date_fin)||null,
        heure_prevue:form.heure_prevue||null, heure_fin:form.heure_fin||null,
        technicien_id:form.technicien_id||null, statut:'planifiee'
      })
      onUpdated()
    } catch {}
    setLoading(false)
  }
  return (
    <button className="btn btn-primary" onClick={handleReport} disabled={loading}>
      {loading?'Reporter...':'Confirmer le report'}
    </button>
  )
}

const S = {
  overlay:{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,backdropFilter:'blur(4px)'},
  modal:{background:'#1a2535',border:'1px solid rgba(255,255,255,0.1)',borderRadius:16,width:'90%',maxWidth:620,maxHeight:'90vh',display:'flex',flexDirection:'column'},
  header:{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'18px 24px',borderBottom:'1px solid rgba(255,255,255,0.08)',flexShrink:0},
  title:{fontSize:'1.05rem',fontWeight:600,color:'#fff'},
  close:{background:'none',border:'none',color:'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:'1.1rem',padding:4,flexShrink:0},
  body:{padding:24,flex:1,overflowY:'auto'},
  footer:{padding:'14px 24px',borderTop:'1px solid rgba(255,255,255,0.08)',display:'flex',gap:10,alignItems:'center',flexShrink:0},
  error:{background:'rgba(231,76,60,0.12)',border:'1px solid rgba(231,76,60,0.3)',borderRadius:8,padding:'10px 14px',color:'#e74c3c',fontSize:'0.875rem'},
}
