# ReclaimBio

Landing page for ReclaimBio, an R&D-stage biotechnology company engineering microbes to
turn unclaimed agricultural biomass into fermentation-based biosurfactants.

The page is a single continuous camera move through six rooms — feedstock, strain
engineering, fermentation, downstream purification, performance testing, product — driven
entirely by scroll position. Six video legs are seeked frame-by-frame against scroll rather
than played, so the camera moves exactly as fast as the reader does.

## Running it

Any static file server. There is no build step.

```bash
python -m http.server 8899
# http://127.0.0.1:8899/index.html
```

Opening `index.html` from the filesystem will not work — the video elements need HTTP range
requests to seek.

## Layout

| Path | |
|---|---|
| `index.html` | The page: theme, copy config, heading-motion CSS and its driver |
| `scrub-engine.js` | The scroll-scrub engine. Builds all DOM from the config object |
| `assets/` | Six `webp` posters and six `mp4` legs, plus `-m` variants for the 9:16 mobile chain |

## Notes for anyone editing this

**`scrub-engine.js` is treated as read-only.** All theming lives in the deliberately
*unlayered* `<style>` block in `index.html` — the engine ships its defaults inside
`@layer sw {…}`, so unlayered rules win regardless of order. Don't wrap that block in a
layer.

**The engine rewrites `opacity` and `transform` on every `.sw-copy` every frame.** Nothing
can be animated on that element directly. Two consequences worth knowing:

- The heading reveal reads `.sw-copy`'s inline opacity as a 0→1→0 "presence" value, mirrors
  it into a `--rb-p` custom property, and animates the *children* off that. So the motion
  tracks scroll position and cannot fight the scrub.
- Vertical centring uses `translate:0 -50%`, not `transform`. The engine's own
  `translateY(-50%)` never survives its per-frame write, which silently drops the copy
  below the midline and clips it at shorter viewport heights.

**Every `var()` in the reveal carries a fallback of `1`,** so if the driver script never
runs the page renders as fully-revealed static type rather than invisible text.

**Copy contrast is measured, not assumed.** The footage runs 87–105 luma behind the text, so
legibility comes from a weak wide wash plus a local ink bed on `.sw-copy::before` — which
inherits the engine's animated opacity, and therefore arrives and leaves with the words
instead of permanently dimming a third of the shot. If you change the scrim, the copy, or the
footage, re-measure. Current worst case is 5.67:1 against a 4.5:1 target, and the binding
constraint is the 12.8px accent eyebrow, not the body or the title.

**Reduced motion is honoured** — every reveal resolves to opacity 1 with no transform and no
animation.

A `<noscript>` fallback carries all six sections as plain text, because the engine builds
every node from JavaScript and the page is otherwise blank without it.
