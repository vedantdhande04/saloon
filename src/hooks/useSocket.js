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
  const [bannedUntil, setBannedUntil] = useState(0)

  useEffect(() => {
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
          } else {
            localStorage.removeItem(STORAGE_KEY)
            setName('')
            setJoined(false)
            if (res?.error === 'Banned') {
              setBannedUntil(res.until || Date.now())
            }
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
    socket.on('chat:deleted', ({ id }) => {
      setMessages((prev) => prev.filter((m) => m.id !== id))
    })
    socket.on('chat:renamed', ({ name: nextName }) => {
      if (!nextName) return
      setName(nextName)
      localStorage.setItem(STORAGE_KEY, nextName)
    })
    socket.on('chat:banned', ({ until }) => {
      setBannedUntil(until || Date.now())
      setJoined(false)
      setName('')
      localStorage.removeItem(STORAGE_KEY)
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
          setBannedUntil(0)
          setShowRespectNote(true)
          window.setTimeout(() => setShowRespectNote(false), 4500)
        } else if (res?.error === 'Banned') {
          setBannedUntil(res.until || Date.now())
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
    bannedUntil,
    joinChat,
    sendMessage,
  }
}
