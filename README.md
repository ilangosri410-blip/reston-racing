# Reston Racing — 2026 Dirt Bike Racing Championship

A one-chapter-at-a-time cinematic site. Seven full-screen chapters, no page scroll.

## Run locally

No build step and no dependencies — it is plain HTML, CSS and JS. It must be
served over HTTP (opening `index.html` from the file system blocks the videos
and fonts).

```bash
cd reston-racing
python3 -m http.server 8300      # or: npx serve .
```

Then open <http://localhost:8300>.

## Structure

```
index.html          markup for all seven chapters, the chrome and the overlays
css/tokens.css      colour, z-index, easing and spacing tokens — theme lives here
css/base.css        reset, typography, @font-face, reduced-motion
css/chrome.css      header, rail, pager, menu, cursor, ignition, transition veil, reader
css/chapters.css    the seven chapters
js/app.js           runtime: chapter registry, media scheduling, transitions,
                    cursor, gestures, menu, ignition, brochure reader
assets/img          photography, extracted artwork, posters, brochure pages
assets/video        five clips, WebM/VP9 + H.264 MP4
assets/fonts        TeX Gyre Heros Condensed (GUST licence)
assets/pdf          championship and proposal documents
build_*.py/.sh      dev-only asset build scripts (not needed to run the site)
shoot.py verify.py  dev-only screenshot and verification harnesses
```

## Editing sections

The `CH` array at the top of `js/app.js` is the single source of truth for
section order, labels and transition words. The top nav, the right-hand rail,
the full-screen menu, the chapter tag, the progress fuel and the pager label are
all generated from it.

To rename, add, remove or reorder a section: edit that array and add or remove
the matching `<section class="ch">` in `index.html`. Nothing else needs to
change — if the two get out of step, the console warns on load.

## Navigation

- Right-hand rail, top nav, full-screen menu, prev/next pager, home control
- Keyboard: arrows, PageUp/PageDown, Space, Home, End, 1–7, Escape
- Horizontal trackpad gesture or horizontal wheel; vertical scrolling never
  changes chapter
- Touch: deliberate one-finger horizontal swipe. Vertical swipes, taps, small
  movements, two-finger gestures and pinch/zoom never navigate.
