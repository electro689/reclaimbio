import { SmoothScroll } from '@/components/layout/SmoothScroll'
import { Cursor } from '@/components/layout/Cursor'
import { Navbar } from '@/components/layout/Navbar'
import { Scene3D } from '@/components/three/Scene3D'
import { ScrollDebug } from '@/components/layout/ScrollDebug'

/**
 * STAGE 2 — 3D scroll engine mounted.
 *
 * Layer order (bottom → top):
 *   Scene3D    fixed, -z-10, pointer-events-none
 *   <main>     z-10 content
 *   Navbar     z-50
 *   Cursor     z-100
 *
 * Placeholder sections remain — they provide the scroll runway the engine needs
 * and are replaced wholesale in Stage 3. ScrollDebug is a temporary Stage-2
 * verification HUD and gets removed before Stage 3 ships.
 */
export default function App() {
  return (
    <SmoothScroll>
      <Cursor />
      <Navbar />
      <Scene3D />
      <ScrollDebug />

      <main id="top" className="relative z-10">
        <PlaceholderSection
          id="hero"
          index="00"
          label="Hero — Scroll 0"
          title={
            <>
              Chaotic
              <br />
              Waste
            </>
          }
          note="Dense, turbulent cloud of toxic neon green. Scroll slowly and watch the field organise."
          accent="var(--color-toxic)"
        />
        <PlaceholderSection
          id="process"
          index="01"
          label="Process — Scroll 50%"
          title={
            <>
              Polymer
              <br />
              Helix
            </>
          }
          note="Particles have accelerated into a structured double helix and transitioned to bioluminescent cyan."
          accent="var(--color-biolum)"
        />
        <PlaceholderSection
          id="impact"
          index="02"
          label="Impact — Scroll 100%"
          title={
            <>
              Starlit
              <br />
              Void
            </>
          }
          note="The helix disperses into a calm shell of light. Camera retreats to open space."
          accent="var(--color-biolum)"
        />

        <footer
          id="contact"
          className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-6 py-32"
        >
          <p className="label-tech">Engine online</p>
          <p className="body-relaxed text-center text-ash-500">
            Thousands of particles, three baked formations, morphed entirely on the GPU.
          </p>
        </footer>
      </main>
    </SmoothScroll>
  )
}

interface PlaceholderSectionProps {
  id: string
  index: string
  label: string
  title: React.ReactNode
  note: string
  accent: string
}

function PlaceholderSection({ id, index, label, title, note, accent }: PlaceholderSectionProps) {
  return (
    <section
      id={id}
      className="relative flex min-h-screen flex-col justify-center px-6 py-32 md:px-12"
    >
      <div className="absolute top-0 right-6 left-6 h-px bg-ash-100/5 md:right-12 md:left-12" />

      <div className="mx-auto w-full max-w-[1600px]">
        <div className="mb-6 flex items-center gap-4">
          <span className="label-tech" style={{ color: accent, textShadow: `0 0 12px ${accent}` }}>
            {index}
          </span>
          <span className="h-px w-16" style={{ backgroundColor: accent, opacity: 0.4 }} />
          <span className="label-tech">{label}</span>
        </div>

        <h2 className="display-tight text-[clamp(2.5rem,8vw,6.5rem)] text-ash-100">{title}</h2>

        <p className="body-relaxed mt-8 text-ash-500">{note}</p>
      </div>
    </section>
  )
}
