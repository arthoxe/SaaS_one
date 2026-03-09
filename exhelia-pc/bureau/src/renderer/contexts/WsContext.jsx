import { createContext, useContext, useEffect, useRef, useState } from 'react'

const WsContext = createContext(null)

export function WsProvider({ children }) {
  const ws      = useRef(null)
  const [connected, setConnected] = useState(false)
  const listeners = useRef({})

  const connect = () => {
    const token = localStorage.getItem('access_token')
    if (!token) return

    ws.current = new WebSocket(`ws://212.227.39.223/ws?token=${token}`)

    ws.current.onopen  = () => setConnected(true)
    ws.current.onclose = () => {
      setConnected(false)
      // Reconnexion automatique après 3s
      setTimeout(connect, 3000)
    }
    ws.current.onmessage = (e) => {
      try {
        const { type, data } = JSON.parse(e.data)
        if (listeners.current[type]) {
          listeners.current[type].forEach(cb => cb(data))
        }
      } catch {}
    }
  }

  useEffect(() => {
    connect()
    return () => ws.current?.close()
  }, [])

  const on = (type, cb) => {
    if (!listeners.current[type]) listeners.current[type] = []
    listeners.current[type].push(cb)
    return () => {
      listeners.current[type] = listeners.current[type].filter(f => f !== cb)
    }
  }

  return (
    <WsContext.Provider value={{ connected, on }}>
      {children}
    </WsContext.Provider>
  )
}

export const useWs = () => useContext(WsContext)
