import { ArrowUpRight } from 'lucide-react'
import { LINKS } from '../config'
import { useClock } from '../hooks/useClock'

function SpotifyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  )
}

function YtMusicIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104S8.076 4.896 12 4.896s7.104 3.18 7.104 7.104-3.18 7.104-7.104 7.104zm0-13.332c-3.432 0-6.228 2.796-6.228 6.228S8.568 18.228 12 18.228s6.228-2.796 6.228-6.228S15.432 5.772 12 5.772zM9.684 15.54V8.46L16.5 12l-6.816 3.54z" />
    </svg>
  )
}

function LinkArrow() {
  return (
    <ArrowUpRight
      size={12}
      strokeWidth={2.4}
      className="opacity-90"
      aria-hidden="true"
    />
  )
}

function NavLink({ href, label, children }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 transition hover:text-white sm:gap-1.5"
      aria-label={label}
    >
      {children}
      <LinkArrow />
    </a>
  )
}

export function TopBar({ online }) {
  const time = useClock()

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-2 px-3 pt-3 text-[12px] font-medium tracking-wide text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.55)] sm:px-7 sm:pt-5 sm:text-sm">
      <div className="min-w-0 shrink-0 sm:min-w-[5.5rem]">{time}</div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <span className="online-dot inline-block h-2 w-2 rounded-full bg-[#39ff6a] shadow-[0_0_8px_rgba(57,255,106,0.7)]" />
        <span className="whitespace-nowrap">{online} online</span>
      </div>

      <nav className="pointer-events-auto flex min-w-0 shrink-0 items-center justify-end gap-2.5 text-white sm:gap-4">
        <NavLink href={LINKS.spotify} label="Spotify">
          <SpotifyIcon />
          <span className="hidden sm:inline">Spotify</span>
        </NavLink>

        <NavLink href={LINKS.ytMusic} label="YT Music">
          <YtMusicIcon />
          <span className="hidden sm:inline">YT Music</span>
        </NavLink>

        <NavLink href={LINKS.codvyn} label="Codvyn on Instagram">
          <img
            src="/codvyn.png"
            alt=""
            className="h-3.5 w-3.5 rounded-sm object-cover sm:h-4 sm:w-4"
          />
          <span className="hidden sm:inline">codvyn</span>
        </NavLink>
      </nav>
    </header>
  )
}
