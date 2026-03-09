import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api.js'
const AuthContext = createContext(null)
export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    const saved = localStorage.getItem('user')
    if (token && saved) {
      setUserState(JSON.parse(saved))
    }
    setLoading(false)
  }, [])

  const setUser = (updater) => {
    setUserState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      localStorage.setItem('user', JSON.stringify(next))
      return next
    })
  }

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('access_token', data.access_token)
    localStorage.setItem('refresh_token', data.refresh_token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUserState(data.user)
    return data.user
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout', { refresh_token: localStorage.getItem('refresh_token') })
    } catch {}
    localStorage.clear()
    setUserState(null)
  }

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
export const useAuth = () => useContext(AuthContext)
