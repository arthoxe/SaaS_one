import { useState, useEffect, useRef, useCallback } from 'react'
import { useWs } from '../contexts/WsContext.jsx'
import api from '../api.js'
import ModalCreerIntervention from '../components/ModalCreerIntervention.jsx'
import ModalModifierIntervention from '../components/ModalModifierIntervention.jsx'

const TYPES_COLORS = {
  vmc: '#4ab840', pac: '#D4A843', solaire: '#f39c12',
  chaudiere: '#e74c3c', ventilation: '#3498db', climatisation: '#9b59b6', autre: '#95a5a6'
}
const DAYS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim']

function dateStr(d) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
}

function addDays(isoDate, n) {
  const d = new Date(isoDate + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return dateStr(d)
}

function getWeekDates(offset = 0) {
  const now = new Date()
  const day = now.getDay() || 7
  const mon = new Date(now)
  mon.setDate(now.getDate() - day + 1 + offset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon); d.setDate(mon.getDate() + i); return d
  })
}

// Calcule le span visible dans la semaine courante
// Retourne aussi si l'intervention continue sur la semaine suivante (partial right)
// et si elle commence avant (partial left)
function getVisibleSpan(inter, weekDates) {
  const startISO = inter.date_prevue?.split('T')[0]
  const endISO   = inter.date_fin?.split('T')[0] || startISO
  const wStart   = dateStr(weekDates[0])
  const wEnd     = dateStr(weekDates[6])

  // L'inter doit commencer cette semaine pour être affiché dans une colonne
  const startIdx = weekDates.findIndex(d => dateStr(d) === startISO)
  if (startIdx === -1) return { span: 0 }

  // Fin visible: soit dans la semaine, soit coupée à la dernière col
  const endIdx = weekDates.findIndex(d => dateStr(d) === endISO)
  const resolvedEnd = endIdx === -1 ? 6 : endIdx
  const span = Math.max(1, resolvedEnd - startIdx + 1)
  const continuesNext = endISO > wEnd

  return { span, startIdx, continuesNext }
}

export default function Planning() {
  const { on }   = useWs()
  const [weekOffset, setWeekOffset]       = useState(0)
  const [interventions, setInterventions] = useState([])
  const [techniciens, setTechniciens]     = useState([])
  const [filterTech, setFilterTech]       = useState('')
  const [loading, setLoading]             = useState(true)
  const [showCreate, setShowCreate]       = useState(false)
  const [selected, setSelected]           = useState(null)

  const resizingRef  = useRef(null)
  const wasDragging  = useRef(false)
  const gridRef      = useRef(null)
  const intervRef    = useRef([]) // ref sync pour onMove

  const weekDates = getWeekDates(weekOffset)
  const weekStart = dateStr(weekDates[0])
  const weekEnd   = dateStr(weekDates[6])
  const todayStr  = dateStr(new Date())

  useEffect(() => {
    loadData()
    const u1 = on('intervention:created', loadData)
    const u2 = on('intervention:updated', loadData)
    const u3 = on('intervention:deleted', loadData)
    return () => { u1(); u2(); u3() }
  }, [weekOffset, filterTech])

  // Garder une ref sync des interventions pour les callbacks de resize
  useEffect(() => { intervRef.current = interventions }, [interventions])

  const loadData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ date_debut: weekStart, date_fin: weekEnd, limit: '200' })
      if (filterTech) params.set('technicien_id', filterTech)
      const [intRes, techRes] = await Promise.all([
        api.get('/interventions?' + params),
        api.get('/techniciens')  // filtrés equipe_id IS NOT NULL
      ])
      const techs = techRes.data || []
      const techIds = new Set(techs.map(t => t.id))
      // Ne montrer que les interventions sans tech OU avec un tech qui a une équipe
      const inters = (intRes.data.data || []).filter(i =>
        !i.technicien_id || techIds.has(i.technicien_id)
      )
      setInterventions(inters)
      setTechniciens(techs)
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  const getColWidth = () => {
    if (!gridRef.current) return 140
    const col = gridRef.current.querySelector('[data-col]')
    return col ? col.getBoundingClientRect().width : 140
  }

  const getIntersForDay = (dayDate) => {
    const ds = dateStr(dayDate)
    return interventions.filter(i => i.date_prevue?.split('T')[0] === ds)
  }

  const handleResizeStart = useCallback((e, inter) => {
    e.stopPropagation()
    e.preventDefault()
    wasDragging.current = false

    const colW    = getColWidth() + 6  // +gap
    const origEnd = inter.date_fin?.split('T')[0] || inter.date_prevue?.split('T')[0]
    let lastDiff  = 0

    resizingRef.current = { id: inter.id, startX: e.clientX, origEnd, colW }

    const onMove = (ev) => {
      if (!resizingRef.current) return
      const dx = ev.clientX - resizingRef.current.startX
      if (Math.abs(dx) > 3) wasDragging.current = true

      const daysDiff = Math.round(dx / resizingRef.current.colW)
      if (daysDiff === lastDiff) return
      lastDiff = daysDiff

      const startISO = intervRef.current.find(i => i.id === resizingRef.current.id)?.date_prevue?.split('T')[0]
      if (!startISO) return

      const newEnd = addDays(resizingRef.current.origEnd, daysDiff)
      if (newEnd < startISO) return

      setInterventions(prev => prev.map(i =>
        i.id === resizingRef.current?.id ? { ...i, date_fin: newEnd } : i
      ))
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      if (!resizingRef.current) return
      const id = resizingRef.current.id
      resizingRef.current = null
      const updated = intervRef.current.find(i => i.id === id)
      if (updated) api.patch('/interventions/' + id, { date_fin: updated.date_fin }).catch(() => {})
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  const handleInterClick = (inter) => {
    if (wasDragging.current) { wasDragging.current = false; return }
    setSelected(inter)
  }

  return (
    <div style={{ padding: '24px 28px', height: 'calc(100vh - 38px)', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 600, color: '#fff' }}>Planning</h1>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setWeekOffset(o => o - 1)}>Prec.</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setWeekOffset(0)}
              style={weekOffset === 0 ? { borderColor: 'var(--green)', color: 'var(--green)' } : {}}>
              Aujourd'hui
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setWeekOffset(o => o + 1)}>Suiv.</button>
          </div>
          <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.35)' }}>
            {weekDates[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} —{' '}
            {weekDates[6].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>+ Nouvelle intervention</button>
          <select className="input" style={{ maxWidth: 190, color: '#fff', background: '#1e2d42' }}
            value={filterTech} onChange={e => setFilterTech(e.target.value)}>
            <option value="">Tous les techniciens</option>
            {techniciens.map(t => <option key={t.id} value={t.id}>{t.prenom} {t.nom}</option>)}
          </select>
        </div>
      </div>

      {/* Grille */}
      <div ref={gridRef} style={{
        flex: 1, minHeight: 0,
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6,
        overflow: 'hidden'
      }}>
        {weekDates.map((date, di) => {
          const ds      = dateStr(date)
          const isToday = ds === todayStr
          const inters  = getIntersForDay(date)
          const isWE    = di >= 5

          return (
            <div key={ds} data-col={di} style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              {/* Header jour */}
              <div style={{
                padding: '8px 6px', flexShrink: 0, borderRadius: '8px 8px 0 0', textAlign: 'center',
                background: isToday ? 'rgba(74,184,64,0.18)' : isWE ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
                border: '1px solid ' + (isToday ? 'rgba(74,184,64,0.35)' : 'rgba(255,255,255,0.07)'),
                borderBottom: 'none'
              }}>
                <div style={{ fontSize: '0.68rem', color: isWE ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{DAYS[di]}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: isToday ? 'var(--green)' : isWE ? 'rgba(255,255,255,0.3)' : '#fff', marginTop: 2 }}>{date.getDate()}</div>
                {inters.length > 0 && <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{inters.length}</div>}
              </div>

              {/* Corps colonne — overflow visible pour les spans */}
              <div style={{
                flex: 1, padding: 4,
                background: isToday ? 'rgba(74,184,64,0.03)' : isWE ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.02)',
                border: '1px solid ' + (isToday ? 'rgba(74,184,64,0.18)' : 'rgba(255,255,255,0.05)'),
                borderTop: 'none', borderRadius: '0 0 8px 8px',
                display: 'flex', flexDirection: 'column', gap: 4,
                position: 'relative', overflow: 'visible', minHeight: 0
              }}>
                {loading && di === 0 && (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
                    <span className="loader" style={{ width: 14, height: 14 }} />
                  </div>
                )}

                {inters.map(inter => {
                  const color  = TYPES_COLORS[inter.type] || '#4ab840'
                  const { span, continuesNext } = getVisibleSpan(inter, weekDates)
                  if (!span) return null

                  // Largeur exacte: span colonnes + (span-1) gaps
                  const w = span > 1 ? 'calc(' + (span * 100) + '% + ' + ((span - 1) * 6) + 'px)' : '100%'

                  return (
                    <div key={inter.id} onClick={() => handleInterClick(inter)}
                      style={{
                        padding: '5px 14px 5px 8px', borderRadius: 6, cursor: 'pointer',
                        background: color + '22',
                        border: '1px solid ' + color + '55', borderLeftWidth: 3,
                        position: 'relative', userSelect: 'none',
                        width: w, boxSizing: 'border-box',
                        zIndex: span > 1 ? 10 : 1, flexShrink: 0,
                      }}
                    >
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color, letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {inter.type?.toUpperCase()}{span > 1 ? ' ' + span + 'j' : ''}{continuesNext ? ' →' : ''}
                      </div>
                      {inter.heure_prevue && (
                        <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>
                          {inter.heure_prevue.slice(0,5)}{inter.heure_fin ? ' - ' + inter.heure_fin.slice(0,5) : ''}
                        </div>
                      )}
                      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {inter.adresse}
                      </div>
                      {inter.tech_nom && (
                        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {inter.tech_prenom} {inter.tech_nom}
                        </div>
                      )}
                      <span className={'badge badge-' + inter.statut} style={{ fontSize: '0.6rem', padding: '1px 5px', marginTop: 3, display: 'inline-block' }}>
                        {inter.statut?.replace('_', ' ')}
                      </span>
                      {/* Poignee resize */}
                      <div onMouseDown={e => handleResizeStart(e, inter)}
                        style={{
                          position: 'absolute', right: 0, top: 0, bottom: 0, width: 14,
                          cursor: 'ew-resize', borderRadius: '0 4px 4px 0',
                          background: color + '40',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                        <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.6)', letterSpacing: '-1px' }}>|||</span>
                      </div>
                    </div>
                  )
                })}

                {!loading && inters.length === 0 && (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.08)' }}>-</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legende */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', paddingTop: 10, flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 10 }}>
        {Object.entries(TYPES_COLORS).map(([type, color]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: 'inline-block' }} />
            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{type}</span>
          </div>
        ))}
      </div>

      {showCreate && (
        <ModalCreerIntervention techniciens={techniciens} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); loadData() }}/>
      )}
      {selected && (
        <ModalModifierIntervention intervention={selected} techniciens={techniciens}
          onClose={() => setSelected(null)} onUpdated={() => { setSelected(null); loadData() }} onDeleted={() => { setSelected(null); loadData() }}/>
      )}
    </div>
  )
}
