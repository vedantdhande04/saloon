import { Pause, Play, SkipBack, SkipForward } from 'lucide-react'

export function MusicPlayer({
  ready,
  playing,
  title,
  artist,
  videoId,
  currentLabel,
  durationLabel,
  progress,
  onToggle,
  onPrev,
  onNext,
  onSeek,
}) {
  const thumb = videoId
    ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    : null

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-4 sm:pb-6">
      <div className="pointer-events-auto flex w-full max-w-[720px] items-center gap-3 rounded-full border border-[var(--glass-border)] bg-[var(--glass)] px-3 py-2.5 text-white shadow-[0_16px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:gap-4 sm:px-4 sm:py-3">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-white/10 sm:h-14 sm:w-14">
          {thumb ? (
            <img src={thumb} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-white/10" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold sm:text-[15px]">{title}</div>
          <div className="truncate text-xs text-white/70 sm:text-[13px]">{artist}</div>

          <div className="mt-1.5 flex items-center gap-2">
            <span className="w-10 shrink-0 text-[10px] tabular-nums text-white/65 sm:text-[11px]">
              {currentLabel}
            </span>
            <button
              type="button"
              aria-label="Seek"
              disabled={!ready}
              className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-white/25"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const ratio = (e.clientX - rect.left) / rect.width
                onSeek(Math.min(1, Math.max(0, ratio)))
              }}
            >
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-white"
                style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
              />
            </button>
            <span className="w-10 shrink-0 text-right text-[10px] tabular-nums text-white/65 sm:text-[11px]">
              {durationLabel}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <button
            type="button"
            aria-label="Previous"
            disabled={!ready}
            onClick={onPrev}
            className="rounded-full p-1.5 text-white/90 transition hover:bg-white/10 disabled:opacity-40"
          >
            <SkipBack size={18} fill="currentColor" />
          </button>
          <button
            type="button"
            aria-label={playing ? 'Pause' : 'Play'}
            disabled={!ready}
            onClick={onToggle}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black transition hover:scale-[1.03] disabled:opacity-40 sm:h-11 sm:w-11"
          >
            {playing ? (
              <Pause size={18} fill="currentColor" />
            ) : (
              <Play size={18} fill="currentColor" className="translate-x-[1px]" />
            )}
          </button>
          <button
            type="button"
            aria-label="Next"
            disabled={!ready}
            onClick={onNext}
            className="rounded-full p-1.5 text-white/90 transition hover:bg-white/10 disabled:opacity-40"
          >
            <SkipForward size={18} fill="currentColor" />
          </button>
        </div>
      </div>

      {/* Hidden YouTube host */}
      <div className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0">
        <div id="yt-player" />
      </div>
    </div>
  )
}
