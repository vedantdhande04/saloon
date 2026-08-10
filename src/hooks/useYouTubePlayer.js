import { useEffect, useRef, useState } from 'react'
import { YOUTUBE_PLAYLIST_ID } from '../config'

function loadYouTubeApi() {
  if (window.YT?.Player) return Promise.resolve()

  return new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      previous?.()
      resolve()
    }

    if (!document.getElementById('youtube-iframe-api')) {
      const tag = document.createElement('script')
      tag.id = 'youtube-iframe-api'
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
    }
  })
}

function parseTitle(raw) {
  const title = raw || 'Saloon song'
  const parts = title.split(' - ')
  if (parts.length >= 2) {
    return { title: parts[0].trim(), artist: parts.slice(1).join(' - ').trim() }
  }
  return { title, artist: 'Unknown' }
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function useYouTubePlayer() {
  const playerRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [meta, setMeta] = useState({
    title: 'Loading playlist…',
    artist: 'Deluxe Saloon',
    videoId: '',
    duration: 0,
    current: 0,
  })

  useEffect(() => {
    let cancelled = false
    let tick

    async function init() {
      await loadYouTubeApi()
      if (cancelled) return

      playerRef.current = new window.YT.Player('yt-player', {
        height: '0',
        width: '0',
        playerVars: {
          listType: 'playlist',
          list: YOUTUBE_PLAYLIST_ID,
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
        },
        events: {
          onReady: (event) => {
            setReady(true)
            try {
              event.target.setVolume(80)
              syncMeta(event.target)
            } catch {
              /* ignore */
            }
          },
          onStateChange: (event) => {
            const state = event.data
            setPlaying(state === window.YT.PlayerState.PLAYING)
            if (
              state === window.YT.PlayerState.PLAYING ||
              state === window.YT.PlayerState.PAUSED ||
              state === window.YT.PlayerState.BUFFERING ||
              state === window.YT.PlayerState.CUED
            ) {
              syncMeta(event.target)
            }
          },
        },
      })

      tick = window.setInterval(() => {
        const player = playerRef.current
        if (!player?.getCurrentTime) return
        try {
          setMeta((prev) => ({
            ...prev,
            current: player.getCurrentTime() || 0,
            duration: player.getDuration() || prev.duration,
          }))
        } catch {
          /* ignore */
        }
      }, 500)
    }

    function syncMeta(player) {
      try {
        const data = player.getVideoData?.() || {}
        const parsed = parseTitle(data.title)
        setMeta((prev) => ({
          ...prev,
          title: parsed.title,
          artist: parsed.artist,
          videoId: data.video_id || prev.videoId,
          duration: player.getDuration?.() || prev.duration,
          current: player.getCurrentTime?.() || prev.current,
        }))
      } catch {
        /* ignore */
      }
    }

    init()

    return () => {
      cancelled = true
      if (tick) window.clearInterval(tick)
      try {
        playerRef.current?.destroy?.()
      } catch {
        /* ignore */
      }
    }
  }, [])

  function toggle() {
    const player = playerRef.current
    if (!player) return
    if (playing) player.pauseVideo()
    else player.playVideo()
  }

  function next() {
    playerRef.current?.nextVideo?.()
  }

  function prev() {
    playerRef.current?.previousVideo?.()
  }

  function seek(ratio) {
    const player = playerRef.current
    if (!player || !meta.duration) return
    player.seekTo(meta.duration * ratio, true)
  }

  return {
    ready,
    playing,
    title: meta.title,
    artist: meta.artist,
    videoId: meta.videoId,
    currentLabel: formatTime(meta.current),
    durationLabel: formatTime(meta.duration),
    progress: meta.duration ? meta.current / meta.duration : 0,
    toggle,
    next,
    prev,
    seek,
  }
}
