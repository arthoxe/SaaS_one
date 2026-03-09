import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'
import { useWs } from '../contexts/WsContext.jsx'
import ModalProfil from './ModalProfil.jsx'
const logoImg = '/logo.png'

const navAdmin = [
  { to: '/',            label: 'Tableau de bord' },
  { to: '/planning',    label: 'Planning' },
  { to: '/rapports',    label: 'Rapports' },
  { to: '/techniciens', label: '\u00c9quipes' },
  { to: '/recherche',   label: 'Recherche' },
  { to: '/parametres',  label: 'Param\u00e8tres' },
]

const navBureau = [
  { to: '/',            label: 'Tableau de bord' },
  { to: '/planning',    label: 'Planning' },
  { to: '/rapports',    label: 'Rapports' },
  { to: '/techniciens', label: '\u00c9quipes' },
  { to: '/recherche',   label: 'Recherche' },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const { connected }    = useWs()
  const navigate         = useNavigate()
  const [showProfil, setShowProfil] = useState(false)
  const isAdmin = user?.role === 'admin'
  const nav     = isAdmin ? navAdmin : navBureau

  const handleLogout = async () => { await logout(); navigate('/login') }

  return (
    <div style={{...S.root}}>
      <style>{`
        .nav-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 12px; border-radius: 8px;
          color: rgba(255,255,255,0.4); font-size: 0.875rem;
          text-decoration: none; transition: all 0.2s ease;
          border-left: 2px solid transparent;
        }
        .nav-item .nav-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: currentColor; flex-shrink: 0; opacity: 0.5;
          transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s;
        }
        .nav-item.active { background: rgba(74,184,64,0.1); color: #fff; border-left: 2px solid var(--green); }
        .nav-item.active .nav-dot { opacity: 1; transform: translateX(4px); }
        .nav-item:hover:not(.active) { color: rgba(255,255,255,0.7); background: rgba(255,255,255,0.04); }
        .nav-item:hover:not(.active) .nav-dot { transform: translateX(2px); opacity: 0.8; }
        .profile-clickable { transition: background 0.15s; border-radius: 8px; cursor: pointer; }
        .profile-clickable:hover { background: rgba(255,255,255,0.07) !important; }
        .logout-btn:hover { color: #e74c3c !important; }
      `}</style>

      <aside style={{...S.sidebar}}>
        <div style={{...S.logo}}>
          <img src={logoImg} alt="exhelia" style={{ height: 140, width: '250px', objectFit: 'contain', display: 'block', marginLeft:-40, marginRight: 0 }}/>
          <span style={{...S.logoSub}}>Bureau</span>
        </div>

        <nav style={{...S.nav}}>
          {nav.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}
              className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
              <span className="nav-dot" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div style={{...S.sidebarBottom}}>
          <div style={{...S.wsStatus}}>
            <span style={{...S.wsDot, background: connected ? 'var(--green)' : 'var(--danger)', boxShadow: connected ? '0 0 8px rgba(74,184,64,0.6)' : 'none'}}/>
            <span style={{...S.wsLabel}}>{connected ? 'Temps r\u00e9el actif' : 'Reconnexion...'}</span>
          </div>
          <div className="profile-clickable" style={{...S.profile}} onClick={() => setShowProfil(true)}>
            <div style={{...S.profileAvatar, overflow: 'hidden', padding: user?.photo ? 0 : undefined}}>
              {user?.photo
                ? <img src={user.photo} alt="profil" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }}/>
                : <span>{user?.prenom?.[0]}{user?.nom?.[0]}</span>
              }
            </div>
            <div style={{...S.profileInfo}}>
              <span style={{...S.profileName}}>{user?.prenom} {user?.nom}</span>
              <span style={{...S.profileRole}}>{user?.role}</span>
            </div>
            <button className="logout-btn"
              onClick={e => { e.stopPropagation(); handleLogout() }}
              style={{...S.logoutBtn}} title="D\u00e9connexion">
              &#x23FB;
            </button>
          </div>
        </div>
      </aside>

      <main style={{...S.main}}>{children}</main>
      {showProfil && <ModalProfil onClose={() => setShowProfil(false)} />}
    </div>
  )
}

const S = {
  root: { display: 'flex', height: '100vh', overflow: 'hidden' },
  sidebar: { width: 'var(--sidebar-w)', flexShrink: 0, background: 'rgba(255,255,255,0.03)', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', paddingTop: 'var(--titlebar-h)' },
  logo: { padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  logoSub: { display: 'block', fontSize: '0.65rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginTop: 6 },
  nav: { flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' },
  sidebarBottom: { padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.06)' },
  wsStatus: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', marginBottom: 8 },
  wsDot: { width: 7, height: 7, borderRadius: '50%', flexShrink: 0 },
  wsLabel: { fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' },
  profile: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.04)' },
  profileAvatar: { width: 32, height: 32, borderRadius: '50%', background: 'var(--green)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 600, flexShrink: 0 },
  profileInfo: { flex: 1, minWidth: 0 },
  profileName: { display: 'block', fontSize: '0.8rem', color: '#fff', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  profileRole: { display: 'block', fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', textTransform: 'capitalize' },
  logoutBtn: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '1.1rem', padding: '2px 4px', transition: 'color 0.15s', flexShrink: 0 },
  main: { flex: 1, overflow: 'auto', paddingTop: 'var(--titlebar-h)' }
}
