/* ===========================================================================
   MOBILE UTILITY LAYER — generator
   ---------------------------------------------------------------------------
   Writes css/tw.css: a Tailwind-vocabulary, utility-first layer for the mobile
   composition. It scans index.html, emits ONLY the utilities actually used
   (the same "just in time" idea Tailwind's JIT engine uses) and wraps the whole
   output in the project's phone media query, so:

     · desktop cannot see a single one of these rules — the desktop design is
       locked by construction, not by discipline;
     · there is no runtime dependency, no CDN script and no build step for
       anyone running `npm run dev` — the generated file is committed;
     · the file stays a couple of kilobytes instead of a framework.

   Colour is deliberately NOT hard-coded here: every colour utility resolves a
   CSS custom property, so one set of mobile markup serves the dark and the
   light theme without a second class on any element.

   Regenerate after editing mobile markup:   node build-mobile-css.js
   =========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PHONE = '@media (max-width:760px),(max-height:520px) and (orientation:landscape)';

/* the mobile-range breakpoints: this layer is authored mobile-first from 360px
   up, and these are the only widths it ever steps at. Nothing here reaches
   past 760px. */
const SCREENS = { xs: '390px', sm: '430px' };

/* Tailwind's spacing scale, in the steps this project uses */
const SP = {
  '0': '0px', '0.5': '2px', '1': '4px', '1.5': '6px', '2': '8px', '2.5': '10px',
  '3': '12px', '3.5': '14px', '4': '16px', '5': '20px', '6': '24px', '7': '28px',
  '8': '32px', '10': '40px', '12': '48px', '14': '56px', '16': '64px'
};

/* the mobile type scale, as a theme — not a pile of arbitrary values */
const TEXT = {
  eyebrow: ['10px', '1', '.3em'],
  micro:   ['9.5px', '1.3', '.18em'],
  note:    ['10.5px', '1.45', '.01em'],
  line:    ['13px', '1.55', '.005em'],
  card:    ['12.5px', '1.15', '.06em'],
  stat:    ['26px', '1', '.01em'],
  title:   ['46px', '.9', '-.03em'],
  hero:    ['58px', '.86', '-.03em']
};

/* every colour is a token, so both themes are served by one class */
const COLOR = {
  ink: 'var(--rr-text)', dim: 'var(--rr-text-dim)', faint: 'var(--rr-text-faint)',
  gold: 'var(--rr-red)', goldbright: 'var(--rr-red-bright)'
};

const STATIC = {
  block: 'display:block', 'inline-block': 'display:inline-block',
  flex: 'display:flex', 'inline-flex': 'display:inline-flex', grid: 'display:grid',
  hidden: 'display:none',
  'flex-col': 'flex-direction:column', 'flex-wrap': 'flex-wrap:wrap',
  'items-center': 'align-items:center', 'items-start': 'align-items:flex-start',
  'items-baseline': 'align-items:baseline', 'items-end': 'align-items:flex-end',
  'justify-between': 'justify-content:space-between',
  'justify-center': 'justify-content:center', 'justify-end': 'justify-content:flex-end',
  'shrink-0': 'flex-shrink:0', 'grow': 'flex-grow:1',
  'grid-cols-2': 'grid-template-columns:repeat(2,minmax(0,1fr))',
  'grid-cols-3': 'grid-template-columns:repeat(3,minmax(0,1fr))',
  'overflow-x-auto': 'overflow-x:auto;overflow-y:hidden',
  'overflow-y-auto': 'overflow-y:auto;overflow-x:hidden',
  'overflow-hidden': 'overflow:hidden',
  'snap-x': 'scroll-snap-type:x mandatory',
  'snap-mandatory': 'scroll-snap-type:x mandatory',
  'snap-start': 'scroll-snap-align:start',
  'text-left': 'text-align:left', 'text-right': 'text-align:right',
  'text-center': 'text-align:center',
  uppercase: 'text-transform:uppercase',
  'font-bold': 'font-weight:700', 'font-normal': 'font-weight:400',
  italic: 'font-style:italic', 'not-italic': 'font-style:normal',
  relative: 'position:relative', absolute: 'position:absolute',
  'w-full': 'width:100%', 'h-full': 'height:100%',
  'whitespace-nowrap': 'white-space:nowrap'
};

const esc = (c) => c.replace(/([.:[\]()/#%+])/g, '\\$1');
const arb = (v) => v.replace(/_/g, ' ');

function decl(cls) {
  if (STATIC[cls]) return STATIC[cls];

  let m;
  /* type scale + arbitrary sizes */
  if ((m = cls.match(/^text-(.+)$/))) {
    const k = m[1];
    if (TEXT[k]) return `font-size:${TEXT[k][0]};line-height:${TEXT[k][1]};letter-spacing:${TEXT[k][2]}`;
    if (COLOR[k]) return `color:${COLOR[k]}`;
    if ((m = k.match(/^\[(.+)\]$/))) {
      const v = arb(m[1]);
      return v.startsWith('color:') ? `color:${v.slice(6)}` : `font-size:${v}`;
    }
  }
  if ((m = cls.match(/^tracking-\[(.+)\]$/))) return `letter-spacing:${arb(m[1])}`;
  if ((m = cls.match(/^leading-\[(.+)\]$/))) return `line-height:${arb(m[1])}`;

  /* spacing */
  const SIDES = {
    p: ['padding'], px: ['padding-left', 'padding-right'], py: ['padding-top', 'padding-bottom'],
    pt: ['padding-top'], pr: ['padding-right'], pb: ['padding-bottom'], pl: ['padding-left'],
    m: ['margin'], mx: ['margin-left', 'margin-right'], my: ['margin-top', 'margin-bottom'],
    mt: ['margin-top'], mr: ['margin-right'], mb: ['margin-bottom'], ml: ['margin-left']
  };
  if ((m = cls.match(/^(p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml)-(.+)$/))) {
    const props = SIDES[m[1]];
    const raw = m[2];
    const v = raw.startsWith('[') ? arb(raw.slice(1, -1)) : SP[raw];
    if (v) return props.map((p) => `${p}:${v}`).join(';');
  }
  if ((m = cls.match(/^(gap-x|gap-y|gap)-(.+)$/))) {
    const raw = m[2];
    const v = raw.startsWith('[') ? arb(raw.slice(1, -1)) : SP[raw];
    if (v) return m[1] === 'gap' ? `gap:${v}` : `${m[1] === 'gap-x' ? 'column' : 'row'}-gap:${v}`;
  }

  /* sizing */
  if ((m = cls.match(/^(w|h|min-w|min-h|max-w|max-h)-\[(.+)\]$/))) {
    const P = { w: 'width', h: 'height', 'min-w': 'min-width', 'min-h': 'min-height',
                'max-w': 'max-width', 'max-h': 'max-height' };
    return `${P[m[1]]}:${arb(m[2])}`;
  }
  if ((m = cls.match(/^(w|h)-(.+)$/)) && SP[m[2]]) {
    return `${m[1] === 'w' ? 'width' : 'height'}:${SP[m[2]]}`;
  }
  return null;
}

/* ── scan the markup ─────────────────────────────────────────────────────── */
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const used = new Set();
for (const m of html.matchAll(/class="([^"]*)"/g)) {
  m[1].split(/\s+/).forEach((c) => c && used.add(c));
}

const base = [];
const screens = {};
Object.keys(SCREENS).forEach((s) => { screens[s] = []; });
const skipped = [];

[...used].sort().forEach((cls) => {
  const parts = cls.split(':');
  const bare = parts.pop();
  const variant = parts[0];
  if (parts.length > 1) return;                        // no stacked variants in use
  const d = decl(bare);
  if (!d) { if (/^(peer|mob|rj|snap|is-)/.test(cls) === false && /-/.test(cls)) skipped.push(cls); return; }
  const rule = `.${esc(cls)}{${d}}`;
  if (!variant) base.push(rule);
  else if (screens[variant]) screens[variant].push(rule);
});

let out = `/* ===========================================================================
   MOBILE UTILITY LAYER — GENERATED FILE, DO NOT EDIT BY HAND
   Regenerate with:  node build-mobile-css.js
   ---------------------------------------------------------------------------
   Utility-first (Tailwind vocabulary), emitted just-in-time from the classes
   actually present in index.html, and wrapped in the project's phone query so
   the approved desktop design cannot be reached by any rule in this file.
   Colours resolve CSS custom properties, so one set of mobile markup serves
   both the dark and the light theme.
   =========================================================================== */
${PHONE}{
${base.map((r) => '  ' + r).join('\n')}
`;
Object.keys(SCREENS).forEach((s) => {
  if (!screens[s].length) return;
  out += `\n  /* ≥ ${SCREENS[s]} — still inside the phone range */\n`;
  out += `  @media (min-width:${SCREENS[s]}){\n`;
  out += screens[s].map((r) => '    ' + r).join('\n');
  out += '\n  }\n';
});
out += '}\n';

fs.writeFileSync(path.join(ROOT, 'css', 'tw.css'), out);
console.log('css/tw.css  ' + base.length + ' utilities, ' + out.length + ' bytes');
if (skipped.length) console.log('not utilities (component classes): ' + skipped.join(' '));
