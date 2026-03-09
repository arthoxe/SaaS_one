import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx'
import { WsProvider } from './contexts/WsContext.jsx'
import Login from './pages/Login.jsx'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Planning from './pages/Planning.jsx'
import Techniciens from './pages/Techniciens.jsx'
import Rapports from './pages/Rapports.jsx'
import Recherche from './pages/Recherche.jsx'
import Parametres from './pages/Parametres.jsx'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#1a2332' }}>
      <span className="loader" />
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function AdminRoute({ children }) {
  const { user } = useAuth()
  if (user?.role !== 'admin') return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={
          <PrivateRoute>
            <WsProvider>
              <Layout>
                <Routes>
                  <Route path="/"            element={<Dashboard />} />
                  <Route path="/planning"    element={<Planning />} />
                  <Route path="/rapports"    element={<Rapports />} />
                  <Route path="/techniciens" element={<Techniciens />} />
                  <Route path="/recherche"   element={<Recherche />} />
                  <Route path="/parametres"  element={<AdminRoute><Parametres /></AdminRoute>} />
                  <Route path="*"            element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </WsProvider>
          </PrivateRoute>
        } />
      </Routes>
    </AuthProvider>
  )
}
