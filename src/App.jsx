import { useState } from 'react'
import { Chat } from './components/Chat'
import { MusicPlayer } from './components/MusicPlayer'
import { NameGate } from './components/NameGate'
import { TopBar } from './components/TopBar'
import { useSocket } from './hooks/useSocket'
import { useYouTubePlayer } from './hooks/useYouTubePlayer'

export default function App() {
  const [askName, setAskName] = useState(false)
  const {
    online,
    messages,
    name,
    joined,
    showRespectNote,
    joinChat,
    sendMessage,
  } = useSocket()
  const player = useYouTubePlayer()

  return (
    <div className="relative h-full w-full overflow-hidden bg-[var(--bg)]">
      {/* Off-screen but sized — YouTube playlist API fails in a 0×0 iframe */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -left-[9999px] top-0 h-[180px] w-[320px] overflow-hidden opacity-0"
      >
        <div id="yt-player" />
      </div>

      <div className="bg-stage" aria-hidden="true">
        <img src="/bg.jpg" alt="" />
      </div>

      <TopBar online={online} />

      <main className="pointer-events-none absolute inset-x-0 top-[42%] z-10 flex -translate-y-1/2 justify-center px-4 sm:top-[46%]">
        <h1 className="font-display animate-soft-in select-none text-center text-[clamp(2.4rem,8vw,5.4rem)] leading-[0.95] tracking-wide text-white drop-shadow-[0_6px_24px_rgba(0,0,0,0.35)]">
          बाबा सैलून
        </h1>
      </main>

      <Chat
        joined={joined}
        name={name}
        messages={messages}
        showRespectNote={showRespectNote}
        onSend={sendMessage}
        onRequestJoin={() => setAskName(true)}
      />

      <NameGate
        open={askName && !joined}
        onJoin={async (value) => {
          const res = await joinChat(value)
          if (res?.ok) setAskName(false)
          return res
        }}
      />

      <MusicPlayer
        ready={player.ready}
        playing={player.playing}
        title={player.title}
        artist={player.artist}
        videoId={player.videoId}
        currentLabel={player.currentLabel}
        durationLabel={player.durationLabel}
        progress={player.progress}
        onToggle={player.toggle}
        onPrev={player.prev}
        onNext={player.next}
        onSeek={player.seek}
      />
    </div>
  )
}
