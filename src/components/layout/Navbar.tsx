import { useEffect, useRef, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { useScroll } from '@/lib/scroll-context'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { label: 'Process', href: '#process' },
  { label: 'Impact', href: '#impact' },
  { label: 'Science', href: '#science' },
] as const

/**
 * Fixed navbar. Transparent over the hero, then fades in glass + a hairline
 * once the user leaves the top of the page. A cyan filament along the bottom
 * edge doubles as a scroll-progress readout.
 *
 * The scrolled flag and progress bar are driven from the scroll ref inside a
 * rAF loop; only the boolean crossing a threshold touches React state, so we
 * re-render at most twice per scroll direction change instead of every frame.
 */
export function Navbar() {
  const { stateRef, lenis } = useScroll()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const progressRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let rafId = 0
    let lastScrolled = false
    let lastProgress = -1

    const tick = () => {
      const { scroll, progress } = stateRef.current

      const isScrolled = scroll > 24
      if (isScrolled !== lastScrolled) {
        lastScrolled = isScrolled
        setScrolled(isScrolled)
      }

      // The progress filament is the only per-frame DOM write here — skip it
      // unless progress actually moved, so this loop idles cheaply instead of
      // forcing style recalc on every frame while the page sits still.
      if (progressRef.current && Math.abs(progress - lastProgress) > 0.0005) {
        lastProgress = progress
        progressRef.current.style.transform = `scaleX(${progress})`
      }

      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [stateRef])

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    if (!menuOpen) return
    lenis?.stop()
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      lenis?.start()
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen, lenis])

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    setMenuOpen(false)
    const el = document.querySelector(href)
    if (!el) return
    if (lenis) {
      lenis.scrollTo(el as HTMLElement, { offset: 0, duration: 1.6 })
    } else {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-all duration-500',
          scrolled ? 'glass-thin' : 'border-b border-transparent bg-transparent',
        )}
      >
        <nav
          aria-label="Primary"
          className="mx-auto flex h-20 max-w-[1600px] items-center justify-between px-6 md:px-12"
        >
          {/* ---- Wordmark ---- */}
          <a
            href="#top"
            onClick={(e) => handleNavClick(e, '#top')}
            className="group flex items-center gap-3"
            aria-label="ReclaimBio — home"
          >
            {/* Living indicator: the cell that does the work. */}
            <span className="relative flex h-2 w-2 shrink-0">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                style={{ backgroundColor: 'var(--color-biolum)' }}
              />
              <span
                className="relative inline-flex h-2 w-2 rounded-full"
                style={{
                  backgroundColor: 'var(--color-biolum)',
                  boxShadow: '0 0 10px var(--color-biolum)',
                }}
              />
            </span>
            <span className="font-display text-[0.9375rem] font-bold tracking-[-0.02em] text-ash-100 uppercase">
              Reclaim
              <span
                className="transition-colors duration-300 group-hover:text-biolum"
                style={{ color: 'var(--color-ash-500)' }}
              >
                Bio
              </span>
            </span>
          </a>

          {/* ---- Desktop links ---- */}
          <div className="hidden items-center gap-10 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="group relative py-2 text-[0.8125rem] font-medium tracking-[0.14em] text-ash-300 uppercase transition-colors duration-300 hover:text-ash-100"
              >
                {link.label}
                {/* Underline wipe */}
                <span
                  className="absolute -bottom-0.5 left-0 h-px w-0 transition-all duration-400 ease-[var(--ease-out-expo)] group-hover:w-full"
                  style={{ backgroundColor: 'var(--color-biolum)' }}
                />
              </a>
            ))}

            <a
              href="#contact"
              onClick={(e) => handleNavClick(e, '#contact')}
              className="hairline group relative overflow-hidden rounded-full px-6 py-2.5 text-[0.75rem] font-medium tracking-[0.16em] text-ash-100 uppercase transition-all duration-400 hover:border-biolum/40"
            >
              <span className="relative z-10">Contact</span>
              <span
                className="absolute inset-0 -translate-y-full transition-transform duration-400 ease-[var(--ease-out-expo)] group-hover:translate-y-0"
                style={{
                  background:
                    'linear-gradient(to bottom, color-mix(in oklab, var(--color-biolum) 18%, transparent), transparent)',
                }}
              />
            </a>
          </div>

          {/* ---- Mobile trigger ---- */}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="flex h-10 w-10 items-center justify-center text-ash-100 md:hidden"
          >
            {menuOpen ? <X size={20} strokeWidth={1.5} /> : <Menu size={20} strokeWidth={1.5} />}
          </button>
        </nav>

        {/* ---- Scroll progress filament ---- */}
        <div className="absolute inset-x-0 bottom-0 h-px overflow-hidden">
          <div
            ref={progressRef}
            className="h-full w-full origin-left"
            style={{
              backgroundColor: 'var(--color-biolum)',
              boxShadow: '0 0 8px var(--color-biolum)',
              transform: 'scaleX(0)',
            }}
          />
        </div>
      </header>

      {/* ---- Mobile drawer ---- */}
      <div
        id="mobile-menu"
        className={cn(
          'fixed inset-0 z-40 flex flex-col items-center justify-center gap-2 transition-all duration-500 md:hidden',
          menuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        style={{
          backgroundColor: 'color-mix(in oklab, var(--color-void) 92%, transparent)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        {[...NAV_LINKS, { label: 'Contact', href: '#contact' }].map((link, i) => (
          <a
            key={link.href}
            href={link.href}
            onClick={(e) => handleNavClick(e, link.href)}
            className="font-display px-8 py-4 text-3xl font-bold tracking-[-0.03em] text-ash-100 uppercase transition-all duration-500"
            style={{
              transform: menuOpen ? 'translateY(0)' : 'translateY(20px)',
              opacity: menuOpen ? 1 : 0,
              transitionDelay: menuOpen ? `${120 + i * 70}ms` : '0ms',
            }}
          >
            {link.label}
          </a>
        ))}
      </div>
    </>
  )
}
