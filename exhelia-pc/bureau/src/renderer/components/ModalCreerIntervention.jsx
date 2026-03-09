import { useState, useEffect, useRef } from 'react'
import api from '../api.js'

const INTER_TYPES = ['vmc','pac','solaire','chaudiere','ventilation','climatisation','autre']
const DEFAULT_DURATIONS = { vmc:60, pac:120, solaire:180, chaudiere:90, ventilation:60, climatisation:120, autre:60 }

function addMinutes(t, min) {
  if (!t || !t.includes(':')) return ''
  const [h,m] = t.split(':').map(Number)
  const tot = h*60+m+min
  return String(Math.floor(tot/60)%24).padStart(2,'0')+':'+String(tot%60).padStart(2,'0')
}

function groupByBatiment(logements) {
  const map = {}
  ;(logements||[]).forEach(l => {
    const key = (l.adresse||'')+'|'+(l.ville||'')
    if (!map[key]) map[key] = { adresse:l.adresse, ville:l.ville, code_postal:l.code_postal, logements:[] }
    map[key].logements.push(l)
  })
  return Object.values(map)
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


export default function ModalCreerIntervention({ techniciens, onClose, onCreated }) {
  const [clientType, setClientType] = useState('particulier')
  const [typeLieu, setTypeLieu]     = useState('maison')
  const [clientMode, setClientMode] = useState('search')

  const [searchQ, setSearchQ]             = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const searchTimeout = useRef(null)

  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [selectedBailleur, setSelectedBailleur]   = useState(null)
  const [bailleurLogements, setBailleurLogements] = useState([])
  const [selectedLogements, setSelectedLogements] = useState([])
  const [loadingLogements, setLoadingLogements]   = useState(false)
  const [openBatiments, setOpenBatiments]         = useState({})
  // Nouveau bâtiment à créer
  const [showAddBat, setShowAddBat]   = useState(false)
  const [newBatForm, setNewBatForm]   = useState({ adresse:'', ville:'', code_postal:'' })
  // Nouveaux logements dans un bâtiment existant
  const [addLogInBat, setAddLogInBat] = useState(null) // clé du bâtiment ouvert pour ajout
  const [newLogForm, setNewLogForm]   = useState({ etage:'', numero_porte:'', digicode:'', nom_locataire:'', telephone_loc:'' })

  const [form, setForm] = useState({
    intervention:'vmc', date_prevue:'', date_fin:'', heure_debut:'', heure_fin:'',
    technicien_id:'', notes_bureau:'', duree_inter:'',
    client_id:'', client_nom:'', client_prenom:'', client_tel:'', client_email:'',
    bailleur_nom:'', bailleur_tel:'', bailleur_email:'',
    adresse:'', ville:'', code_postal:'', etage:'', numero_porte:'', digicode:'',
    nom_locataire:'', telephone_loc:'',
    locataires:[{nom:'',telephone:'',etage:'',porte:'',digicode:''}]
  })
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  useEffect(() => {
    if (form.heure_debut && form.heure_debut.length===5)
      set('heure_fin', addMinutes(form.heure_debut, DEFAULT_DURATIONS[form.intervention]||60))
  }, [form.heure_debut, form.intervention])

  useEffect(() => {
    if (form.date_prevue && form.date_prevue.length===10) set('date_fin', form.date_prevue)
  }, [form.date_prevue])

  useEffect(() => {
    if (searchQ.length < 2) { setSearchResults([]); return }
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const {data} = await api.get('/recherche?q=' + encodeURIComponent(searchQ))
        setSearchResults(data.data || [])
      } catch {}
      setSearchLoading(false)
    }, 300)
  }, [searchQ])

  const selectResult = async (r) => {
    setSearchQ(r.nom + (r.prenom ? ' ' + r.prenom : ''))
    setSearchResults([])
    if (r.type === 'bailleur') {
      setClientType('bailleur')
      setSelectedBailleur(r)
      setLoadingLogements(true)
      setClientMode('bailleur_batiments')
      setSelectedLogements([])
      setOpenBatiments({})
      try {
        const { data } = await api.get('/recherche/client/' + r.id)
        setBailleurLogements(data.logements || [])
        set('client_id', r.id)
      } catch {}
      setLoadingLogements(false)
    } else if (r.type === 'pro') {
      setClientType('pro'); setForm(f=>({...f,client_id:r.id})); setClientMode('selected')
    } else {
      setClientType('particulier'); setForm(f=>({...f,client_id:r.id})); setClientMode('selected')
    }
  }

  const toggleLogement = (id) =>
    setSelectedLogements(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id])

  const toggleBatiment = (key) =>
    setOpenBatiments(prev => ({...prev, [key]: !prev[key]}))

  // Ajouter un nouveau bâtiment (logement type_lieu=batiment) pour le bailleur sélectionné
  const addBatiment = async () => {
    if (!newBatForm.adresse || !newBatForm.ville || !newBatForm.code_postal) return
    try {
      await api.post('/logements', {
        client_id: selectedBailleur.id,
        adresse: newBatForm.adresse, ville: newBatForm.ville, code_postal: newBatForm.code_postal,
        type_lieu: 'batiment'
      })
      // Recharger les logements
      const { data } = await api.get('/recherche/client/' + selectedBailleur.id)
      setBailleurLogements(data.logements || [])
      setNewBatForm({ adresse:'', ville:'', code_postal:'' })
      setShowAddBat(false)
    } catch { setError('Erreur ajout bâtiment') }
  }

  // Ajouter un logement dans un bâtiment existant
  const addLogementDansBat = async (batAdresse, batVille, batCodePostal) => {
    if (!newLogForm.nom_locataire) return
    try {
      await api.post('/logements', {
        client_id: selectedBailleur.id,
        adresse: batAdresse, ville: batVille, code_postal: batCodePostal,
        etage: newLogForm.etage||null, numero_porte: newLogForm.numero_porte||null,
        digicode: newLogForm.digicode||null, nom_locataire: newLogForm.nom_locataire,
        telephone_loc: newLogForm.telephone_loc||null, type_lieu: 'batiment'
      })
      const { data } = await api.get('/recherche/client/' + selectedBailleur.id)
      setBailleurLogements(data.logements || [])
      setNewLogForm({ etage:'', numero_porte:'', digicode:'', nom_locataire:'', telephone_loc:'' })
      setAddLogInBat(null)
    } catch { setError('Erreur ajout logement') }
  }

  const addLoc = () => set('locataires',[...form.locataires,{nom:'',telephone:'',etage:'',porte:'',digicode:''}])
  const updLoc = (i,k,v) => { const a=[...form.locataires]; a[i]={...a[i],[k]:v}; set('locataires',a) }
  const remLoc = (i) => set('locataires',form.locataires.filter((_,idx)=>idx!==i))

  const handleSubmit = async () => {
    setError(''); setLoading(true)
    try {
      const date_prevue = parseDate(form.date_prevue)
      const date_fin    = parseDate(form.date_fin)
      if (!date_prevue) { setError('Date de debut invalide (JJ/MM/AAAA)'); setLoading(false); return }
      let logements = []
      if (clientMode === 'bailleur_batiments' && selectedLogements.length > 0) {
        logements = selectedLogements.map(id => ({ logement_id: id }))
      } else if (clientMode === 'selected' && form.client_id) {
        const {data:logRes} = await api.get('/logements?client_id=' + form.client_id)
        const logs = Array.isArray(logRes) ? logRes : (logRes.data || [])
        if (logs.length > 0) logements = [{ logement_id: logs[0].id }]
        else { setError('Aucun logement trouve pour ce client'); setLoading(false); return }
      } else {
        let clientPayload = {}
        if (clientType === 'particulier') {
          if (!form.client_nom) { setError('Nom du client requis'); setLoading(false); return }
          clientPayload = { email: form.client_nom.toLowerCase().replace(/\s/g,'')+Date.now()+'@exhelia-client.fr', password: Math.random().toString(36).slice(-10), type:'particulier', nom:form.client_nom, prenom:form.client_prenom||null, telephone:form.client_tel||null }
        } else if (clientType === 'pro') {
          if (!form.client_nom) { setError("Nom de l'entreprise requis"); setLoading(false); return }
          clientPayload = { email: form.client_email||form.client_nom.toLowerCase().replace(/\s/g,'')+Date.now()+'@exhelia-client.fr', password: Math.random().toString(36).slice(-10), type:'pro', nom:form.client_nom, telephone:form.client_tel||null }
        } else {
          if (!form.bailleur_nom) { setError('Nom du bailleur requis'); setLoading(false); return }
          clientPayload = { email: form.bailleur_email||'bailleur'+Date.now()+'@exhelia-client.fr', password: Math.random().toString(36).slice(-10), type:'bailleur', nom:form.bailleur_nom, telephone:form.bailleur_tel||null }
        }
        const {data:client} = await api.post('/clients', clientPayload)
        if (clientType === 'bailleur' && typeLieu === 'batiment') {
          for (const loc of form.locataires) {
            if (!loc.nom) continue
            const {data:log} = await api.post('/logements', { client_id:client.id, adresse:form.adresse, ville:form.ville, code_postal:form.code_postal, etage:loc.etage||null, numero_porte:loc.porte||null, digicode:loc.digicode||null, nom_locataire:loc.nom, telephone_loc:loc.telephone||null, type_lieu:'batiment' })
            logements.push({ logement_id: log.id })
          }
        } else {
          const {data:log} = await api.post('/logements', { client_id:client.id, adresse:form.adresse, ville:form.ville, code_postal:form.code_postal, etage:form.etage||null, numero_porte:form.numero_porte||null, digicode:form.digicode||null, nom_locataire:clientType==='bailleur'?form.nom_locataire||null:null, telephone_loc:clientType==='bailleur'?form.telephone_loc||null:null, type_lieu:'maison' })
          logements = [{ logement_id: log.id }]
        }
      }
      if (logements.length === 0) { setError('Aucun logement selectionne'); setLoading(false); return }
      let heureDebut = form.heure_debut || null
      for (const log of logements) {
        const heureFin = heureDebut && form.duree_inter ? addMinutes(heureDebut, parseInt(form.duree_inter)) : (form.heure_fin||null)
        await api.post('/interventions', { logement_id:log.logement_id, type:form.intervention, date_prevue, date_fin:date_fin||null, heure_prevue:heureDebut, heure_fin:heureFin, technicien_id:form.technicien_id||null, notes_bureau:form.notes_bureau||null })
        if (form.duree_inter && heureDebut) heureDebut = addMinutes(heureDebut, parseInt(form.duree_inter))
      }
      onCreated()
    } catch(err) { setError(err.response?.data?.error || 'Erreur lors de la creation') }
    setLoading(false)
  }

  const isBailleur = clientType === 'bailleur'
  const isBatiment = isBailleur && typeLieu === 'batiment'

  // Filtrer selon typeLieu pour bailleur existant
  const logementsFiltres = bailleurLogements.filter(l =>
    typeLieu === 'maison' ? l.type_lieu === 'maison' : l.type_lieu === 'batiment'
  )
  const batiments = groupByBatiment(logementsFiltres.filter(l => l.type_lieu === 'batiment'))
  const maisons   = logementsFiltres.filter(l => l.type_lieu === 'maison')

  return (
    <div style={S.overlay} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={S.modal} className="anim-fade-up">
        <div style={S.header}>
          <h2 style={S.title}>Nouvelle intervention</h2>
          <button onClick={onClose} style={S.close}>&#x2715;</button>
        </div>
        <div style={S.body}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,alignItems:'start'}}>

            {/* GAUCHE */}
            <div style={S.section}>
              <div style={S.sectionLabel}>Intervention</div>
              <div>
                <label className="input-label">Type</label>
                <select className="input" value={form.intervention} onChange={e=>set('intervention',e.target.value)} style={{colorScheme:'dark',background:'#1e2d42',color:'#fff'}}>
                  {INTER_TYPES.map(t=><option key={t} value={t}>{t.toUpperCase()}</option>)}
                </select>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <DateField label="Date debut *" value={form.date_prevue} onChange={v=>set('date_prevue',v)}/>
                <DateField label="Date fin" value={form.date_fin} onChange={v=>set('date_fin',v)}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <TimeField label="Heure debut" value={form.heure_debut} onChange={v=>set('heure_debut',v)}/>
                <TimeField label="Heure fin" value={form.heure_fin} onChange={v=>set('heure_fin',v)}/>
              </div>
              <div>
                <label className="input-label">Technicien</label>
                <select className="input" value={form.technicien_id} onChange={e=>set('technicien_id',e.target.value)} style={{colorScheme:'dark',background:'#1e2d42',color:'#fff'}}>
                  <option value="">Non assigne</option>
                  {techniciens.map(t=><option key={t.id} value={t.id}>{t.prenom} {t.nom}</option>)}
                </select>
              </div>
              {isBatiment && (
                <div>
                  <label className="input-label">Duree par logement (min)</label>
                  <input className="input" type="number" placeholder="60" value={form.duree_inter} onChange={e=>set('duree_inter',e.target.value)}/>
                </div>
              )}
              <div>
                <label className="input-label">Notes bureau</label>
                <textarea className="input" rows={2} value={form.notes_bureau} onChange={e=>set('notes_bureau',e.target.value)} style={{resize:'vertical'}}/>
              </div>
            </div>

            {/* DROITE */}
            <div style={{display:'flex',flexDirection:'column',gap:14}}>

              {/* Recherche unifiée */}
              <div style={{position:'relative'}}>
                <label className="input-label">Rechercher un client existant</label>
                <input className="input" placeholder="Nom, prenom, adresse..." value={searchQ}
                  onChange={e=>{setSearchQ(e.target.value);setClientMode('search')}}/>
                {searchLoading && <span className="loader" style={{position:'absolute',right:10,top:32,width:14,height:14}}/>}
                {searchResults.length > 0 && (
                  <div style={S.dropdown}>
                    {searchResults.map(r=>(
                      <div key={r.id} style={S.dropdownItem} onClick={()=>selectResult(r)}>
                        <div style={{display:'flex',alignItems:'center',gap:8}}>
                          <span style={{fontSize:'0.7rem',background:'rgba(255,255,255,0.08)',padding:'2px 7px',borderRadius:4,color:'rgba(255,255,255,0.5)'}}>{r.type}</span>
                          <span style={{color:'#fff',fontSize:'0.875rem',fontWeight:500}}>{r.nom} {r.prenom||''}</span>
                        </div>
                        <div style={{fontSize:'0.75rem',color:'rgba(255,255,255,0.4)',marginTop:2}}>{r.nb_logements} logement(s)</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={S.section}>
                <div style={S.sectionLabel}>Type de client</div>
                <div style={{display:'flex',gap:8}}>
                  {[['particulier','Particulier'],['bailleur','Bailleur'],['pro','Professionnel']].map(([val,label])=>(
                    <button key={val} className="btn btn-sm" style={{flex:1,justifyContent:'center',
                      ...(clientType===val?{background:'rgba(74,184,64,0.15)',border:'1px solid var(--green)',color:'var(--green)'}:{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.6)'})}}
                      onClick={()=>{setClientType(val);setClientMode('search');setSearchQ('');setSelectedBailleur(null);setBailleurLogements([]);setSelectedLogements([]);setOpenBatiments({})}}>
                      {label}
                    </button>
                  ))}
                </div>
                {isBailleur && (
                  <div style={{display:'flex',gap:8}}>
                    {[['maison','Maison'],['batiment','Batiment']].map(([val,label])=>(
                      <button key={val} className="btn btn-sm" style={{flex:1,justifyContent:'center',
                        ...(typeLieu===val?{background:'rgba(212,168,67,0.15)',border:'1px solid #D4A843',color:'#D4A843'}:{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.6)'})}}
                        onClick={()=>{setTypeLieu(val);setSelectedLogements([]);}}>
                        {label}
                      </button>
                    ))}
                  </div>
                )}
                <button className="btn btn-secondary btn-sm" style={{alignSelf:'flex-start'}} onClick={()=>setClientMode(clientMode==='new'?'search':'new')}>
                  {clientMode==='new'?'Annuler':'+ Nouveau client'}
                </button>
                {clientMode==='new' && (
                  isBailleur?(
                    <div style={{display:'flex',flexDirection:'column',gap:10}}>
                      <div><label className="input-label">Nom du bailleur *</label><input className="input" value={form.bailleur_nom} onChange={e=>set('bailleur_nom',e.target.value)}/></div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                        <div><label className="input-label">Telephone</label><input className="input" value={form.bailleur_tel} onChange={e=>set('bailleur_tel',e.target.value)}/></div>
                        <div><label className="input-label">E-mail</label><input className="input" type="email" value={form.bailleur_email} onChange={e=>set('bailleur_email',e.target.value)}/></div>
                      </div>
                    </div>
                  ):clientType==='pro'?(
                    <div style={{display:'flex',flexDirection:'column',gap:10}}>
                      <div><label className="input-label">Nom entreprise *</label><input className="input" value={form.client_nom} onChange={e=>set('client_nom',e.target.value)}/></div>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                        <div><label className="input-label">Telephone</label><input className="input" value={form.client_tel} onChange={e=>set('client_tel',e.target.value)}/></div>
                        <div><label className="input-label">E-mail</label><input className="input" type="email" value={form.client_email} onChange={e=>set('client_email',e.target.value)}/></div>
                      </div>
                    </div>
                  ):(
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                      <div><label className="input-label">Nom *</label><input className="input" value={form.client_nom} onChange={e=>set('client_nom',e.target.value)}/></div>
                      <div><label className="input-label">Prenom</label><input className="input" value={form.client_prenom} onChange={e=>set('client_prenom',e.target.value)}/></div>
                      <div><label className="input-label">Telephone</label><input className="input" value={form.client_tel} onChange={e=>set('client_tel',e.target.value)}/></div>
                    </div>
                  )
                )}
              </div>

              {/* Bailleur existant — maisons ou bâtiments selon toggle */}
              {clientMode === 'bailleur_batiments' && selectedBailleur && (
                <div style={S.section}>
                  {loadingLogements
                    ? <div style={{display:'flex',justifyContent:'center',padding:12}}><span className="loader" style={{width:16,height:16}}/></div>
                    : typeLieu === 'maison' ? (
                      // ── Maisons ──
                      <div style={{display:'flex',flexDirection:'column',gap:6}}>
                        <div style={S.sectionLabel}>Maisons de {selectedBailleur.nom}</div>
                        <div style={{maxHeight:240,overflowY:'auto',display:'flex',flexDirection:'column',gap:4}}>
                          {maisons.length === 0 && <div style={{textAlign:'center',color:'rgba(255,255,255,0.3)',padding:'12px 0',fontSize:'0.85rem'}}>Aucune maison</div>}
                          {maisons.map(log=>(
                            <div key={log.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:6,cursor:'pointer',border:'1px solid',borderColor:selectedLogements.includes(log.id)?'var(--green)':'rgba(255,255,255,0.06)',background:selectedLogements.includes(log.id)?'rgba(74,184,64,0.08)':'rgba(255,255,255,0.02)'}}
                              onClick={()=>toggleLogement(log.id)}>
                              <input type="checkbox" readOnly checked={selectedLogements.includes(log.id)} style={{accentColor:'var(--green)',width:13,height:13,pointerEvents:'none'}}/>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:'0.82rem',color:'#fff',fontWeight:500}}>{log.nom_locataire||'Sans locataire'}</div>
                                <div style={{fontSize:'0.72rem',color:'rgba(255,255,255,0.4)'}}>{log.adresse}, {log.ville}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {selectedLogements.length > 0 && <div style={{fontSize:'0.78rem',color:'var(--green)'}}>✓ {selectedLogements.length} maison(s) selectionnee(s)</div>}
                      </div>
                    ) : (
                      // ── Bâtiments ──
                      <div style={{display:'flex',flexDirection:'column',gap:8}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                          <div style={S.sectionLabel}>Batiments de {selectedBailleur.nom}</div>
                          <button className="btn btn-secondary btn-sm" onClick={()=>setShowAddBat(v=>!v)}>+ Batiment</button>
                        </div>
                        {/* Formulaire nouveau bâtiment */}
                        {showAddBat && (
                          <div style={{display:'flex',flexDirection:'column',gap:8,padding:10,background:'rgba(255,255,255,0.04)',borderRadius:8,border:'1px solid rgba(255,255,255,0.08)'}}>
                            <div><label className="input-label">Adresse *</label><input className="input" value={newBatForm.adresse} onChange={e=>setNewBatForm(f=>({...f,adresse:e.target.value}))}/></div>
                            <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:8}}>
                              <div><label className="input-label">Ville *</label><input className="input" value={newBatForm.ville} onChange={e=>setNewBatForm(f=>({...f,ville:e.target.value}))}/></div>
                              <div><label className="input-label">CP *</label><input className="input" style={{width:80}} value={newBatForm.code_postal} onChange={e=>setNewBatForm(f=>({...f,code_postal:e.target.value}))}/></div>
                            </div>
                            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                              <button className="btn btn-secondary btn-sm" onClick={()=>setShowAddBat(false)}>Annuler</button>
                              <button className="btn btn-primary btn-sm" onClick={addBatiment}>Ajouter</button>
                            </div>
                          </div>
                        )}
                        <div style={{maxHeight:280,overflowY:'auto',display:'flex',flexDirection:'column',gap:6}}>
                          {batiments.length === 0 && <div style={{textAlign:'center',color:'rgba(255,255,255,0.3)',padding:'12px 0',fontSize:'0.85rem'}}>Aucun batiment</div>}
                          {batiments.map((bat,bi)=>{
                            const key = bat.adresse+'|'+bat.ville
                            const isOpen = !!openBatiments[key]
                            const nbSel = bat.logements.filter(l=>selectedLogements.includes(l.id)).length
                            return (
                              <div key={bi}>
                                <div onClick={()=>toggleBatiment(key)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',borderRadius:8,cursor:'pointer',background:nbSel>0?'rgba(74,184,64,0.06)':'rgba(255,255,255,0.03)',border:'1px solid '+(nbSel>0?'rgba(74,184,64,0.3)':'rgba(255,255,255,0.08)')}}>
                                  <div style={{flex:1,minWidth:0}}>
                                    <div style={{fontSize:'0.83rem',color:'#fff',fontWeight:600}}>{bat.adresse}</div>
                                    <div style={{fontSize:'0.72rem',color:'rgba(255,255,255,0.4)',marginTop:1}}>{bat.ville} {bat.code_postal} · {bat.logements.length} logement(s){nbSel>0?' · '+nbSel+' sel.':''}</div>
                                  </div>
                                  <span style={{color:'rgba(255,255,255,0.4)',fontSize:'0.8rem',marginLeft:8,transition:'transform 0.15s',display:'inline-block',transform:isOpen?'rotate(90deg)':'none'}}>▶</span>
                                </div>
                                {isOpen && (
                                  <div style={{paddingLeft:12,display:'flex',flexDirection:'column',gap:3,marginTop:3}}>
                                    {bat.logements.map(log=>(
                                      <div key={log.id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 10px',borderRadius:6,cursor:'pointer',border:'1px solid',borderColor:selectedLogements.includes(log.id)?'var(--green)':'rgba(255,255,255,0.06)',background:selectedLogements.includes(log.id)?'rgba(74,184,64,0.08)':'rgba(255,255,255,0.02)'}}
                                        onClick={()=>toggleLogement(log.id)}>
                                        <input type="checkbox" readOnly checked={selectedLogements.includes(log.id)} style={{accentColor:'var(--green)',width:13,height:13,pointerEvents:'none'}}/>
                                        <div style={{flex:1,minWidth:0}}>
                                          <div style={{fontSize:'0.8rem',color:'#fff',fontWeight:500}}>{log.nom_locataire||'Sans locataire'}{log.etage?' · Et.'+log.etage:''}{log.numero_porte?' P.'+log.numero_porte:''}</div>
                                          {log.telephone_loc && <div style={{fontSize:'0.7rem',color:'rgba(255,255,255,0.35)'}}>{log.telephone_loc}</div>}
                                        </div>
                                      </div>
                                    ))}
                                    {/* Ajouter logement dans ce bâtiment */}
                                    {addLogInBat === key ? (
                                      <div style={{display:'flex',flexDirection:'column',gap:6,padding:8,background:'rgba(255,255,255,0.04)',borderRadius:6,border:'1px solid rgba(255,255,255,0.08)',marginTop:4}}>
                                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}>
                                          <div><label className="input-label">Etage</label><input className="input" value={newLogForm.etage} onChange={e=>setNewLogForm(f=>({...f,etage:e.target.value}))}/></div>
                                          <div><label className="input-label">Porte</label><input className="input" value={newLogForm.numero_porte} onChange={e=>setNewLogForm(f=>({...f,numero_porte:e.target.value}))}/></div>
                                          <div><label className="input-label">Digicode</label><input className="input" value={newLogForm.digicode} onChange={e=>setNewLogForm(f=>({...f,digicode:e.target.value}))}/></div>
                                        </div>
                                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                                          <div><label className="input-label">Nom locataire *</label><input className="input" value={newLogForm.nom_locataire} onChange={e=>setNewLogForm(f=>({...f,nom_locataire:e.target.value}))}/></div>
                                          <div><label className="input-label">Tel locataire</label><input className="input" value={newLogForm.telephone_loc} onChange={e=>setNewLogForm(f=>({...f,telephone_loc:e.target.value}))}/></div>
                                        </div>
                                        <div style={{display:'flex',gap:6,justifyContent:'flex-end'}}>
                                          <button className="btn btn-secondary btn-sm" onClick={()=>setAddLogInBat(null)}>Annuler</button>
                                          <button className="btn btn-primary btn-sm" onClick={()=>addLogementDansBat(bat.adresse,bat.ville,bat.code_postal)}>Ajouter</button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button className="btn btn-secondary btn-sm" style={{alignSelf:'flex-start',marginTop:4,fontSize:'0.72rem'}} onClick={e=>{e.stopPropagation();setAddLogInBat(key);setNewLogForm({etage:'',numero_porte:'',digicode:'',nom_locataire:'',telephone_loc:''})}}>
                                        + Logement
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                        {selectedLogements.length > 0 && <div style={{fontSize:'0.78rem',color:'var(--green)',fontWeight:500}}>✓ {selectedLogements.length} logement(s) dans {batiments.filter(b=>b.logements.some(l=>selectedLogements.includes(l.id))).length} batiment(s)</div>}
                      </div>
                    )
                  }
                </div>
              )}

              {/* Nouveau client — logement */}
              {(clientMode==='new'||clientMode==='selected') && (
                <div style={S.section}>
                  <div style={S.sectionLabel}>Logement</div>
                  <div><label className="input-label">Adresse *</label><input className="input" value={form.adresse} onChange={e=>set('adresse',e.target.value)}/></div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:10}}>
                    <div><label className="input-label">Ville *</label><input className="input" value={form.ville} onChange={e=>set('ville',e.target.value)}/></div>
                    <div><label className="input-label">CP *</label><input className="input" value={form.code_postal} onChange={e=>set('code_postal',e.target.value)} style={{width:90}}/></div>
                  </div>
                  {!isBatiment && (
                    <>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                        <div><label className="input-label">Etage</label><input className="input" value={form.etage} onChange={e=>set('etage',e.target.value)}/></div>
                        <div><label className="input-label">Porte</label><input className="input" value={form.numero_porte} onChange={e=>set('numero_porte',e.target.value)}/></div>
                        <div><label className="input-label">Digicode</label><input className="input" value={form.digicode} onChange={e=>set('digicode',e.target.value)}/></div>
                      </div>
                      {isBailleur && (
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                          <div><label className="input-label">Nom locataire</label><input className="input" value={form.nom_locataire} onChange={e=>set('nom_locataire',e.target.value)}/></div>
                          <div><label className="input-label">Tel locataire</label><input className="input" value={form.telephone_loc} onChange={e=>set('telephone_loc',e.target.value)}/></div>
                        </div>
                      )}
                    </>
                  )}
                  {isBatiment && (
                    <div style={{display:'flex',flexDirection:'column',gap:8}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={S.sectionLabel}>Locataires</div>
                        <button className="btn btn-secondary btn-sm" onClick={addLoc}>+ Ajouter</button>
                      </div>
                      {form.locataires.map((loc,i)=>(
                        <div key={i} style={{display:'grid',gridTemplateColumns:'2fr 1.2fr 0.8fr 0.8fr 1fr auto',gap:6,alignItems:'end'}}>
                          <div><label className="input-label">{i===0?'Nom':''}</label><input className="input" value={loc.nom} onChange={e=>updLoc(i,'nom',e.target.value)}/></div>
                          <div><label className="input-label">{i===0?'Tel':''}</label><input className="input" value={loc.telephone} onChange={e=>updLoc(i,'telephone',e.target.value)}/></div>
                          <div><label className="input-label">{i===0?'Et.':''}</label><input className="input" value={loc.etage} onChange={e=>updLoc(i,'etage',e.target.value)}/></div>
                          <div><label className="input-label">{i===0?'P.':''}</label><input className="input" value={loc.porte} onChange={e=>updLoc(i,'porte',e.target.value)}/></div>
                          <div><label className="input-label">{i===0?'Code':''}</label><input className="input" value={loc.digicode} onChange={e=>updLoc(i,'digicode',e.target.value)}/></div>
                          <button className="btn btn-danger btn-sm" onClick={()=>remLoc(i)} style={{padding:'8px 10px'}}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          {error && <div style={S.error}>{error}</div>}
        </div>
        <div style={S.footer}>
          <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading?<><span className="loader" style={{width:14,height:14}}/> Creation...</>:"Creer l'intervention"}
          </button>
        </div>
      </div>
    </div>
  )
}

const S = {
  overlay:{position:'fixed',inset:0,background:'rgba(0,0,0,0.78)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,backdropFilter:'blur(4px)'},
  modal:{background:'#1a2535',border:'1px solid rgba(255,255,255,0.1)',borderRadius:16,width:'95%',maxWidth:1000,maxHeight:'94vh',display:'flex',flexDirection:'column'},
  header:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'18px 24px',borderBottom:'1px solid rgba(255,255,255,0.08)',flexShrink:0},
  title:{fontSize:'1.1rem',fontWeight:600,color:'#fff'},
  close:{background:'none',border:'none',color:'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:'1.1rem',padding:4},
  body:{padding:24,overflowY:'auto',flex:1},
  footer:{padding:'14px 24px',borderTop:'1px solid rgba(255,255,255,0.08)',display:'flex',justifyContent:'flex-end',gap:12,flexShrink:0},
  section:{display:'flex',flexDirection:'column',gap:12,padding:16,background:'rgba(255,255,255,0.03)',borderRadius:10,border:'1px solid rgba(255,255,255,0.06)'},
  sectionLabel:{fontSize:'0.72rem',fontWeight:700,color:'var(--green)',textTransform:'uppercase',letterSpacing:'0.12em'},
  error:{background:'rgba(231,76,60,0.12)',border:'1px solid rgba(231,76,60,0.3)',borderRadius:8,padding:'10px 14px',color:'#e74c3c',fontSize:'0.875rem',marginTop:16},
  dropdown:{position:'absolute',top:'100%',left:0,right:0,zIndex:50,background:'#243347',border:'1px solid rgba(255,255,255,0.12)',borderRadius:8,marginTop:4,maxHeight:200,overflowY:'auto',boxShadow:'0 8px 24px rgba(0,0,0,0.5)'},
  dropdownItem:{padding:'10px 14px',cursor:'pointer',borderBottom:'1px solid rgba(255,255,255,0.05)'},
}
