import { ArrowUpRight } from 'lucide-react'
import { LINKS } from '../config'
import { useClock } from '../hooks/useClock'

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
