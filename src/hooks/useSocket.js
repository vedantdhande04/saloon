import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

const STORAGE_KEY = 'saloon-name'

export function useSocket() {
  const socketRef = useRef(null)
  const [online, setOnline] = useState(1)
  const [messages, setMessages] = useState([])
  const [name, setName] = useState(() => localStorage.getItem(STORAGE_KEY) || '')
  const [joined, setJoined] = useState(false)
  const [showRespectNote, setShowRespectNote] = useState(false)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    // Dev: Vite proxies `/socket.io` → localhost:3001
    // Prod: set VITE_SOCKET_URL to your always-on chat server
    const socketUrl = import.meta.env.VITE_SOCKET_URL || '/'
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        socket.emit('chat:join', saved, (res) => {
          if (res?.ok) {
            setName(res.name)
            setJoined(true)
          }
        })
      }
    })

    socket.on('disconnect', () => setConnected(false))
    socket.on('presence', ({ online: count }) => setOnline(count || 1))
    socket.on('chat:history', (history) => setMessages(history || []))
    socket.on('chat:message', (message) => {
      setMessages((prev) => [...prev.slice(-99), message])
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  function joinChat(rawName) {
    return new Promise((resolve) => {
      const next = String(rawName || '').trim()
      if (!next || !socketRef.current) {
        resolve({ ok: false })
        return
      }

      socketRef.current.emit('chat:join', next, (res) => {
        if (res?.ok) {
          localStorage.setItem(STORAGE_KEY, res.name)
          setName(res.name)
          setJoined(true)
          setShowRespectNote(true)
          window.setTimeout(() => setShowRespectNote(false), 4500)
        }
        resolve(res || { ok: false })
      })
    })
  }

  function sendMessage(text) {
    return new Promise((resolve) => {
      if (!socketRef.current) {
        resolve({ ok: false })
        return
      }
      socketRef.current.emit('chat:message', text, (res) => resolve(res || { ok: false }))
    })
  }

  return {
    online,
    messages,
    name,
    joined,
    connected,
    showRespectNote,
    joinChat,
    sendMessage,
  }
}
