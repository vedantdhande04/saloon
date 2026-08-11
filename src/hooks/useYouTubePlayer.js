import { useEffect, useRef, useState } from 'react'
import { YOUTUBE_MIX_ID, YOUTUBE_VIDEO_ID } from '../config'

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

function parseMeta(data = {}) {
  const raw = String(data.title || '').trim()
  if (!raw) return null

  const parts = raw.split(' - ')
  if (parts.length >= 2) {
    return {
      title: parts[0].trim(),
      artist: parts.slice(1).join(' - ').trim() || data.author || 'Unknown',
    }
  }

  return {
    title: raw,
    artist: data.author || 'Unknown',
  }
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
    title: 'Loading…',
    artist: 'Baba Saloon',
    videoId: YOUTUBE_VIDEO_ID,
    duration: 0,
    current: 0,
  })

  useEffect(() => {
    let cancelled = false
    let tick
    let retry

    function syncMeta(player) {
      try {
        const data = player.getVideoData?.() || {}
        const parsed = parseMeta(data)
        if (!parsed) return

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

    async function init() {
      await loadYouTubeApi()
      if (cancelled) return
      if (!document.getElementById('yt-player')) return

      let shuffledOnce = false

      playerRef.current = new window.YT.Player('yt-player', {
        height: '180',
        width: '320',
        videoId: YOUTUBE_VIDEO_ID,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event) => {
            if (cancelled) return
            setReady(true)
            try {
              event.target.setVolume(80)
              // Cue YouTube Mix; once loaded we shuffle + random start (no autoplay)
              event.target.cuePlaylist({
                listType: 'playlist',
                list: YOUTUBE_MIX_ID,
                index: 0,
              })
              syncMeta(event.target)
            } catch {
              try {
                event.target.cueVideoById(YOUTUBE_VIDEO_ID)
              } catch {
                /* ignore */
              }
            }

            let attempts = 0
            retry = window.setInterval(() => {
              attempts += 1
              syncMeta(event.target)
              const data = event.target.getVideoData?.() || {}
              const list = event.target.getPlaylist?.() || []

              if (!shuffledOnce && list.length > 1) {
                shuffledOnce = true
                try {
                  event.target.setShuffle?.(true)
                  const index = Math.floor(Math.random() * list.length)
                  event.target.cuePlaylist({
                    listType: 'playlist',
                    list: YOUTUBE_MIX_ID,
                    index,
                  })
                  // Keep shuffle on after re-cue
                  event.target.setShuffle?.(true)
                  syncMeta(event.target)
                } catch {
                  /* keep whatever is already cued */
                }
              }

              if ((data.title && (shuffledOnce || list.length > 1)) || attempts > 24) {
                window.clearInterval(retry)
              }
            }, 300)
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
          onError: (event) => {
            // Mix failed to embed — fall back to the seed track only
            if (event?.data) {
              try {
                event.target.cueVideoById(YOUTUBE_VIDEO_ID)
              } catch {
                setMeta((prev) => ({
                  ...prev,
                  title: 'Track unavailable',
                  artist: 'Open YT Music',
                }))
              }
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

    init()

    return () => {
      cancelled = true
      if (tick) window.clearInterval(tick)
      if (retry) window.clearInterval(retry)
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
    const player = playerRef.current
    if (!player) return
    if (player.nextVideo) player.nextVideo()
    else {
      player.seekTo(0, true)
      player.playVideo()
    }
  }

  function prev() {
    const player = playerRef.current
    if (!player) return
    if (player.previousVideo) player.previousVideo()
    else {
      player.seekTo(0, true)
      player.playVideo()
    }
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
